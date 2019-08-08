import { fetch } from './fetch';
import { evaluate } from './evaluate';

export function traverse (template, state, id, element, update) {
	if (Array.isArray(template)) {
		return evaluate(template, state, '', element, update);
	}

	const { '': structure, ...attributes } = template;
	const [definition, ...content] = structure;
	const [selector, ...query] = definition.split(' ');

	if (state === undefined) {
		const elements = document.querySelectorAll(selector) || [];
	
		elements.forEach(element => {
			const state = traverse(template, {}, element, () => {
				traverse(template, state, element);
			});
		});

		return;
	} else if (typeof state !== 'object') {
		return;
	} else if (id !== undefined && query.length) {
		if (typeof id === 'number') {
			const value = fetch(query, state);

			if (Array.isArray(value)) {
				const { '': scope, '.': index } = state;

				const children = value.map((item, i) => {
					Object.assign(state, { '': item, '.': i });
					i = `${id}-${i}`;

					return traverse(template, state, i, element, update);
				});

				Object.assign(state, { '': scope, '.': index });

				return element ? '' : children.join('');
			} else if (value === undefined || value === false) {
				return '';
			}

			state[''] = value;
		}

		id = ` data--"${id}"`;
	} else {
		id = '';
	}
	
	const [tag, ...classes] = selector.split('.');

	if (classes.length && !attributes.hasOwnProperty('class')) {
		attributes.class = [];
	}

	const names = Object.keys(attributes).sort();

	let markup = `<${tag}${id}${names.map(name => {
		let expression = attributes[name];

		if (name === 'class' && classes.length) {
			expression = [`${classes.join(' ')} `, ...expression];
		}

		return evaluate(expression, state, name, element, update)
	}).join('')}>`;

	if (content.length) {
		const scope = state[''];
		let node = element ? element.childNodes[0] : undefined;
		
		markup += `${content.map((template, i) => {
			const child = traverse(template, state, i, node, update);
			state[''] = scope;

			if (element) {
				node = child;
			}

			return element ? '' : child;
		}).join('')}</${tag}>`;
	}

	if (update) {
		return state;
	}
	
	return element || markup;
}
