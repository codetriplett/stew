import { parse } from './parse';
import { render } from './render';
import { hydrate } from './hydrate';
import { stringify } from './stringify';
import { server, read } from './server';

let resolver;

export const client = typeof server !== 'function';
export const components = {};
export const actions = {};

export default function stew (input, option) {
	switch (typeof option) {
		case 'string':
			switch (typeof input) {
				case 'string': return parse(input, option);
				case 'number':
					if (!client) {
						server(input, option);
					}

					break;
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
	const { '..': directory } = state;
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
	} else {
		const path = input.replace(/^\/|\.json$/g, '').replace(/\./g, '/');
		let [folder] = directory || [];

		if (typeof folder !== 'string') {
			folder = '';
		}

		resolution = client ? fetch(`/${path}.json`) : new Promise(resolve => {
			read(`${folder}/${path}.json`, 'utf-8', template => {
				return resolve(JSON.parse(template));
			});
		});
	}

	return resolution.then(template => {
		if (input.startsWith('/')) {
			return template;
		} else if (!template) {
			return '';
		} else if (!ready) {
			components[input] = template;
		}

		if (client) {
			Object.assign(state, { '..': directory || [true] })
		}

		return stew(template, state).then(result => {
			if (!/^<html( |>)/.test(result)) {
				return result;
			}

			let scripts = '<script src="/stew.js"></script>';

			directory.slice(1).forEach(name => {
				const json = stringify(components[name]);
				scripts += `<script>stew(${json},'${name}');</script>`;
			});

			return result.replace(/<\/body><\/html>$/, scripts);
		});
	});
}
