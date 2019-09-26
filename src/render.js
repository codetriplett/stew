import { fetch } from './fetch';
import { evaluate } from './evaluate';

export function render (item, state, element) {
	let { '': [tag, ...items], ...attributes } = item;
	const { length } = items;
	const { '.': [option] } = state;
	const names = Object.keys(attributes).sort();
	const generate = typeof option === 'object';
	const hydrate = !generate && !option[''];
	const conditional = Array.isArray(tag);
	let iterate = false;
	let index;

	if (typeof element !== 'object') {
		index = element;
		element = undefined;
	}

	if (conditional) {
		state = fetch(tag[0], state);
		iterate = Array.isArray(state);
		tag = items.shift();
	}

	if (!iterate) {
		state = state !== undefined ? [state] : [];
	}

	const elements = state.reduceRight((elements, state, i) => {
		if (index !== undefined) {
			i = `${index}${iterate ? `-${i}` : ''}`;

			if (!generate) {
				element = document.createElement(tag);

				if (conditional) {
					element.setAttribute('data--', i);
				}
			}
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

		if (generate) {
			const content = length ? `${children.join('')}</${tag}>` : '';
			const id = conditional ? ` data--="${i}"` : '';

			elements.unshift(`<${tag}${id}${values.join('')}>${content}`);
		} else if (!hydrate) {
			children.forEach(child => {
				if (typeof child === 'string') {
					child = [document.createTextNode(child)];
				}

				child.forEach(child => element.appendChild(child));
			});

			elements.unshift(element);
		}

		return elements;
	}, []);

	return generate ? elements.join('') : elements;
}
