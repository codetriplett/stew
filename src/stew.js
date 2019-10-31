import { parse } from './parse';
import { render } from './render';
import { hydrate } from './hydrate';

const documented = typeof document === 'object';
const elemental = typeof Element === 'function';
let resolver;

export const client = documented && elemental;
export const components = {};
export const actions = {};

export default function stew (input, option) {
	switch (typeof option) {
		case 'string':
			switch (typeof input) {
				case 'string': return parse(input, option);
				case 'object': break;
				default: return;
			}

			if (components.hasOwnProperty(option)) {
				return;
			}

			components[option] = input;

			if (!client) {
				return;
			}

			const selector = `[data--=${option}], [data--^="${option} "]`;
			const elements = document.querySelectorAll(selector) || [];

			return elements.forEach(element => stew(element));
		case 'function':
			if (typeof input === 'string') {
				actions[input] = (element, state) => {
					const update = option(state);

					if (typeof update === 'object' && !Array.isArray(update)) {
						stew(element, update);
					}
				};
			}

			return;
		case 'object':
		case 'undefined':
			break;
		default: return;
	}

	switch (typeof input) {
		case 'function':
			resolver = name => {
				if (!name.startsWith('/')) {
					return input(name);
				} else if (typeof option === 'function') {
					return option(name);
				}
			}
			
			return;
		case 'object':
			if (client && input instanceof Element) {
				hydrate(input, option);
				return;
			} else if (Array.isArray(option)) {
				const items = option.map(state => stew(input, state) || '');
				return client ? items.join('') : items.filter(item => item);
			}

			break;
		case 'string': break;
		default: return;
	}

	const state = option ? { ...option } : {};
	Object.assign(state, { '': state, '.': [{}] });

	if (typeof input === 'object') {
		return render(state, input, '', client ? undefined : '');
	} else if (typeof input !== 'string') {
		return;
	}

	const ready = components.hasOwnProperty(input);
	let resolution;

	if (ready) {
		resolution = Promise.resolve(components[input]);
	} else if (resolver) {
		resolution = new Promise(resolve => resolve(resolver(input)));
	} else if (client) {
		resolution = fetch(`/${input.replace(/^\/|\.json$/g, '')}.json`);
	} else {
		return;
	}

	return resolution.then(template => {
		if (input.startsWith('/')) {
			return template;
		} else if (!ready) {
			components[input] = template;
		}

		return stew(template, { ...state, '..': true });
	});
}
