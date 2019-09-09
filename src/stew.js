import { parse } from './parse';
import { render } from './render';

export default function stew (input, state) {
	if (typeof input === 'string') {
		return parse(input);
	} else if (typeof input !== 'object') {
		return;
	}

	const { '': structure, ...attributes } = input;
	let [tag] = structure;

	if (typeof state === 'object') {
		return render(structure, attributes, state);
	} else if (typeof document === 'undefined') {
		return;
	} else if (Array.isArray(tag)) {
		tag = structure[1];
	}

	const { class: [item, ...items] } = attributes;
	const classes = `${item}${items.length ? '' : ' '}`.split(/\s+/);
	const selector = `${tag}.${classes.slice(0, -1).join('.')}`;
	const elements = document.querySelectorAll(selector) || [];

	elements.forEach(element => {
		const state = {};
		const update = () => render(structure, attributes, state, element);

		render(structure, attributes, state, element, update);
	});
}
