import { fetch } from './fetch';
import { evaluate } from './evaluate';

export function render (state, item, name = '', element = '', previous) {
	const generate = typeof element !== 'object';
	let traverse = false;
	let value;

	if (/^\d/.test(name) || !Array.isArray(item)) {
		let { '': [tag, ...items] = [''], ...attributes } = item;
		const conditional = Array.isArray(tag);

		if (!Array.isArray(item)) {
			if (conditional) {
				const scope = fetch(tag[0], state);
				tag = items.shift();

				if (name) {
					attributes['data--'] = [name];
				}

				if (scope === null || scope === false) {
					state = undefined;
				} else if (scope !== true) {
					state = scope;
				}
			}

			item = items;
			items = Object.keys(attributes).sort();
		}

		if (!tag && item.length < 2 && !item[0] || state === undefined) {
			return previous || '';
		} else if (!Array.isArray(state)) {
			state = [state];
		}

		return state.reduceRight((previous, state) => {
			let node = previous ? previous.previousNode : element.lastChild;

			if (name && generate) {
				node = tag ? `<${tag}` : '';
			} else {
				const id = node && node.tagName && node.getAttribute('data--');

				if (!node || id !== (conditional ? name : null)) {
					if (tag) {
						node = document.createElement(tag);
					} else {
						node = document.createTextNode('');
					}

					if (!generate) {
						if (previous) {
							element.insertBefore(node, previous);
						} else {
							element.appendChild(node);
						}
					}
				}
			}

			node = items.reduce((node, name) => {
				return render(state, attributes[name], name, node);
			}, node);

			return render(state, item, node, previous);
		}, previous);
	} else if (typeof name === 'string' && !generate) {
		previous = element.getAttribute(name);
	} else if (name && typeof name.nodeValue === 'string') {
		previous = name.nodeValue;
	} else if (name && !/^\w/.test(name)) {
		traverse = true;
	}

	if (traverse) {
		value = item.reduceRight((previous, item, i) => {
			return render(state, item, String(i), name, previous);
		}, undefined);
	} else {
		value = evaluate(item, state, previous);

		if (value) {
			value = value.length ? value.join('') : true;
		}
	}

	if (traverse) {
		if (typeof name === 'object') {
			return name;
		} else if (item.length) {
			element = `${value}</${name.match(/\S*/)[0].slice(1)}>${element}`;
		}

		return `${name}>${element}`;
	} else if (!/^\w/.test(name)) {
		value = typeof value === 'string' ? value : '';

		if (previous === undefined) {
			return `${value}${element}`;
		} else if (value !== previous) {
			name.nodeValue = value;
		}

		return name;
	} else if (generate) {
		if (value === true) {
			return `${element} ${name}`;
		}

		return `${element}${value !== false ? ` ${name}="${value}"` : ''}`;
	} else if (typeof value === 'boolean') {
		const exists = element.hasAttribute(name);

		if (value && !exists) {
			element.toggleAttribute(name, true);
		} else if (!value && exists) {
			element.removeAttribute(name);
		}
	} else if (value !== previous) {
		element.setAttribute(name, value);
	}

	return element;
}
