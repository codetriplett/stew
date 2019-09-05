import { fetch } from './fetch';
import { evaluate } from './evaluate';
import { modify } from './modify';
import { traverse } from './traverse';

export function render (value, state, element, update) {
	const { '': [...children], ...attributes } = value;
	const names = Object.keys(attributes).sort();
	const tag = children.shift();
	const hydrate = !!update;

	const markup = `<${tag}${names.map(name => {
		const attribute = attributes[name];

		if (name.startsWith('on') !== hydrate) {
			if (hydrate) {
				evaluate(attribute, state, element.getAttribute(name));
			}

			return '';
		} else if (hydrate) {
			const action = fetch(attribute[0], state, name, update);
			return modify(action, name, element);
		}

		const values = evaluate(attribute, state);
		return modify(values, name, element);
	}).join('')}>`;

	if (!children.length) {
		return markup;
	}

	return `${markup}${traverse(children, state, element, update)}</${tag}>`;
}
