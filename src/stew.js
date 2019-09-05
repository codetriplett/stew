import { parse } from './parse';
import { render } from './render';

export default function stew (input, state) {
	if (typeof input === 'string') {
		return parse(input);
	} else if (state) {
		return render(input, state);
	}

	const { '': [tag], class: [item, ...items] } = input;
	const classes = `${item}${items.length ? '' : ' '}`.split(/\s+/);
	const selector = `${tag}.${classes.slice(0, -1).join('.')}`;
	const elements = document.querySelectorAll(selector) || [];

	elements.forEach(element => {
		const state = {};
		const update = () => render(input, state, element);

		render(input, state, element, update);
	});
}
