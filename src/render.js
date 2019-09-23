import { fetch } from './fetch';
import { evaluate } from './evaluate';

export function render (item, state, element) {
	let { '': [tag, ...items], ...attributes } = item;
	const { length } = items;
	const names = Object.keys(attributes).sort();
	const generate = state['.'].hasOwnProperty('backup');
	const index = typeof element !== 'object' ? element : '';
	const conditional = Array.isArray(tag);
	let iterate = false;

	if (conditional) {
		state = fetch(tag[0], state);
		iterate = Array.isArray(state);
		tag = items.shift();
	}

	if (!iterate) {
		state = state !== undefined ? [state] : [];
	}

	const elements = state.reduceRight((elements, state, i) => {
		if (index) {
			element = !generate ? document.createElement(tag) : undefined;
			i = iterate ? `-${i}` : '';
		}

		const children = items.reduceRight((children, item, i) => {
			if (Array.isArray(item)) {
				item = evaluate(item, state);
			} else {
				item = render(item, state, i);
			}

			children.unshift(item);
			return children;
		}, []);
	
		const values = names.map(name => {
			return evaluate(attributes[name], state, name, element);
		}).filter(value => value);

		const content = length ? `${children.join('')}</${tag}>` : '';
		const id = conditional ? ` data--="${`${index}${i}`}"` : '';

		elements.unshift(`<${tag}${id}${values.join('')}>${content}`);

		return elements;
	}, []);

	return elements.join('');
}
