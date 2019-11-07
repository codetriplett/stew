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
			option = option.replace(/:/g, '--');

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
	const slashed = input.startsWith('/');
	let resolution;

	if (ready) {
		resolution = Promise.resolve(components[input]);
	} else if (resolver) {
		resolution = new Promise(resolve => resolve(resolver(input)));
	} else {
		const path = input.replace(/^\/|\.json$/g, '').replace(/:/g, '/');
		let [folder] = directory || [];

		if (typeof folder !== 'string') {
			folder = '';
		}

		resolution = client ? fetch(`/${path}.json`) : new Promise(resolve => {
			read(`${folder}/${path}.json`, 'utf-8', template => {
				if (template) {
					try {
						template = JSON.parse(template);
						const { '': structure } = template;
	
						if (!slashed) {
							if (!structure) {
								template = undefined;
							} else if (structure[0]) {
								structure[0] = input;
							}
						}
					} catch (e) {
						template = undefined;
					}
				}

				resolve(template);
			});
		});
	}

	return resolution.then(template => {
		if (slashed) {
			return template;
		} else if (!template) {
			return '';
		} else if (!ready) {
			components[input] = template;
		}

		if (client) {
			Object.assign(state, { '..': directory || [true, []] });
		}

		resolution = stew(template, state);

		if (!(resolution instanceof Promise)) {
			resolution = Promise.resolve(resolution);
		}

		return resolution.then(result => {
			if (!/^<html( |>)/.test(result)) {
				return result;
			}

			const styles = directory[1].map(path => {
				const href = ` href="/${path}.css"`;
				return `<link${href} rel="stylesheet" type="text/css"></link>`;
			}).join('');

			const doctype = '<!doctype html>';
			let scripts = '<script src="/stew.min.js"></script>';

			directory.slice(2).forEach(name => {
				const json = stringify(components[name]);
				scripts += `<script>stew(${json},'${name}');</script>`;
			});

			result = result.replace(/(?=<\/body><\/html>$)/, scripts);
			return `${doctype}${result.replace(/(?=<\/head>)/, styles)}`;
		});
	});
}
