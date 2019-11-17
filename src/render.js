import stew, { components } from './stew';
import { fetch } from './fetch';
import { locate } from './locate';
import { evaluate } from './evaluate';
import { reduce } from './reduce';
import { clean } from './clean';

function stamp (instance, data, state) {
	if (data && data[0]) {
		const backup = clean(state['.'][0]);
		data[0] = data[0].replace(/:/g, '--');

		if (backup) {
			data.push(JSON.stringify(backup).replace(/'/g, '&#39;'));
		}

		instance = instance.replace(/.*?(?= |>)/, match => {
			return `${match} data--='${data.join(' ')}'`;
		});
	}

	return instance;
}

export function render (state, view, name, node) {
	const root = name === '' || name === undefined;
	const generate = typeof node === 'string';
	const { '..': deferred } = state;

	if (Array.isArray(view)) {
		let value;

		if (view.length > 1 || view[0]) {
			node = !generate ? locate(node, '') : undefined;
			value = evaluate(view, state, node);
		}

		return deferred ? Promise.resolve(value) : value;
	}

	let {
		'': [tag, ...children],
		key = [['.']],
		style,
		script,
		...attributes
	} = view;

	const hydrate = !generate && !state['.'][0][''];
	const conditional = Array.isArray(tag);
	let ignore = false;
	let count;
	let data;

	if (root) {
		data = [tag];
		tag = children.shift();

		if (deferred) {
			const resources = deferred[1];
			const files = [];

			if (style) {
				files.push(...style.map(file => `${file}.css`));
			}

			if (script) {
				files.push(...script.map(file => `${file}.js`));
			}

			files.forEach(file => {
				if (!resources.includes(file)) {
					resources.push(file);
				}
			});
		}
	} else if (style) {
		attributes.style = style;
	}

	if (tag === 'a' && !attributes.hasOwnProperty('href')) {
		attributes.href = ['javascript:void(0);'];
	}

	if (typeof tag === 'string' && tag.endsWith('/')) {
		const name = tag.slice(0, -1);
		const path = evaluate(children[0], state);

		for (const name in attributes) {
			attributes[name] = evaluate(attributes[name], state, name);
		}

		if (deferred) {
			if (path) {
				data = stew(`/${path}`, { ...attributes, '..': deferred });
			} else {
				data = clean(attributes);
			}

			if (deferred.indexOf(name) <= 0) {
				deferred.push(name);
			}

			return Promise.resolve(data).then((data = {}) => {
				return stew(name, { ...data, '..': deferred });
			});
		} else if (components.hasOwnProperty(name) && !path) {
			return stew(components[name], attributes);
		}

		return;
	}
	
	if (hydrate) {
		count = locate(node, conditional ? name : undefined);

		if (typeof count !== 'number') {
			return;
		}
	}

	if (conditional) {
		const [query] = tag;
		let scope = fetch(query, state, count);

		if (typeof scope === 'boolean' && query.length < 2) {
			scope = String(scope);
		}

		tag = children.shift();

		if (scope === null || scope === false || scope === undefined) {
			ignore = true;
			
			if (!generate) {
				state = undefined;
			}
		} else if (scope !== true) {
			state = scope;
		}
	} else {
		name = undefined;
	}

	if (tag === '') {
		return '';
	}

	if (count === undefined) {
		if (!state || Array.isArray(state)) {
			count = state ? state.length : 0;
		}

		node = locate(node, tag, name, count);
	}

	if (state === undefined || node === undefined) {
		return generate ? '' : undefined;
	} else if (!Array.isArray(state)) {
		state = [state];
	}

	if (generate) {
		node = state.map((state, i) => {
			let instance = node[i];
			let resolution;
			
			for (const name in attributes) {
				instance = evaluate(attributes[name], state, name, instance);
			}

			if (children.length) {
				const content = reduce(`</${tag}>`, children.map((child, i) => {
					return html => {
						child = render(state, child, i, '');
						
						if (child instanceof Promise) {
							return child.then(value => `${value || ''}${html}`);
						}

						return `${child || ''}${html}`;
					};
				}));

				if (content instanceof Promise) {
					resolution = content.then(value => `${instance}${value}`);
				} else {
					resolution = `${instance}${content}`;
				}
			} else {
				resolution = instance;
			}

			if (resolution instanceof Promise) {
				return resolution.then(instance => stamp(instance, data, state));
			} else {
				return stamp(resolution, data, state);
			}
		});

		if (ignore) {
			return '';
		} else if (node.some(value => value instanceof Promise)) {
			return Promise.all(node).then(values => values.join(''));
		}

		return node.join('');
	}

	return reduce(node, state.map(state => (node, i) => {
		if (count && i < count - 1) {
			node = node.previousSibling;
		}

		for (const name in attributes) {
			evaluate(attributes[name], state, name, node);
		}

		const lastChild = { parentElement: node, tagName: false };
		let started = false;

		const end = reduce(node.lastChild, children.map(child => (node, i) => {
			const { previousSibling } = node || {};
			let candidate = node;

			if (candidate && started) {
				candidate = previousSibling;
			}

			if (!candidate) {
				candidate = { ...lastChild, nextSibling: node };
			}

			candidate = render(state, child, i, candidate);
			started = started || !!candidate;

			if (candidate) {
				return candidate;
			}

			return node && node.parentElement ? node : previousSibling;
		}));

		if (end instanceof Promise) {
			return end.then(() => node);
		}

		return node;
	}));
}
