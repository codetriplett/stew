import { fetch } from './fetch';
import { evaluate } from './evaluate';
import { modify } from './modify';

export function render (template, state, index, nodes, update) {
	const names = Object.keys(attributes).sort();
	let [tag, ...children] = structure;
	let id = '';

	if (Array.isArray(tag)) {
		state = fetch(tag[0], state);

		if (state === undefined) {
			state = [];
		} else if (!Array.isArray(state)) {
			state = [state];
		}

		return state.map(state => {
			render(children, attributes, state, element, update);
		});
	} else if (typeof tag === 'number') {
		id = ` data--"${tag}"`;
		tag = children.shift();
	}

	const markup = `<${tag}${id}${names.map(name => {
		if (name.startsWith('on')) {
			return '';
		}

		const values = evaluate(attribute, state);
		return modify(values, name, element);
	}).join('')}>`;

	if (!children.length) {
		return markup;
	}

	return `${markup}${}</${tag}>`;
}
