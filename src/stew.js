import { parse } from './parse';
import { render } from './render';
import { clean } from './clean';

export default function stew (input, state) {
	if (typeof input === 'string') {
		return parse(input);
	} else if (typeof input !== 'object') {
		return;
	}

	const { '': structure, ...attributes } = input;
	let [tag] = structure;

	if (typeof state === 'object') {
		let data = {};

		state = { ...state, '.': [data] };
		state[''] = state;

		const html = render(state, input, '0', '');
		data = clean(data);

		if (!data) {
			return html;
		}

		data = JSON.stringify(data).replace(/'/g, '&#39;');
		return html.replace(/^\s*<\w+/, match => `${match} data--='${data}'`);
	} else if (typeof document === 'undefined') {
		return;
	} else if (Array.isArray(tag)) {
		tag = structure[1];
	}

	const { class: [item, ...items] } = attributes;
	const classes = `${item}${items.length ? '' : ' '}`.split(/\s+/);
	const selector = `${tag}.${classes.slice(0, -1).join('.')}`;

	if (selector.endsWith('.')) {
		return;
	}

	const elements = document.querySelectorAll(selector) || [];

	elements.forEach(element => {
		const state = {};
		const update = () => render(state, input, '0', element);
		const data = JSON.parse(element.getAttribute('data--') || '{}');

		element.removeAttribute('data--');
		Object.assign(state, { '': state, '.': [update], ...data });
		render(state, input, '0', element);
		update[''] = true;
	});
}
