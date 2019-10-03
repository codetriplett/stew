import { fetch } from './fetch';
import { evaluate } from './evaluate';
import { locate } from './locate';

export function render (state, view, name, node) {
	const iterative = typeof name !== 'string';
	const generate = typeof node === 'string';
	const hydrate = !generate && !state['.'][0][''];
	let previous;

	if (!Array.isArray(view)) {
		let { '': [tag, ...children], key = [['.']], ...attributes } = view;
		let count = hydrate ? locate(node, name) : undefined;

		if (Array.isArray(tag)) {
			const scope = fetch(tag[0], state, count);
			tag = children.shift();

			if (scope === null || scope === false) {
				state = undefined;
			} else if (scope !== true) {
				state = scope;
			}
		} else {
			name = undefined;
		}
		
		if (!count) {
			count = Array.isArray(state) ? state.length : undefined;
			node = locate(node, tag, name, count);
		}

		if (state === undefined || node === undefined) {
			return generate ? '' : undefined;
		} else if (count !== undefined) {
			state = [state];
		}

		return state.reduceRight((node, state) => {
			for (const name in attributes) {
				node = render(state, attributes[name], name, node);
			}

			const nodes = children.reduceRight((node, item, i) => {
				// TODO: form object with parentElement and nextSibling when creating
				node = render(state, item, i, node);
			}, generate ? node : node.lastChild);

			return generate ? nodes.join('') : node.previousNode;
		}, node);
	} else if (!generate && node) {
		previous = iterative ? node.nodeValue : node.getAttribute(name);
	}

	let value = evaluate(view, state, previous);

	if (value) {
		value = value.length ? value.join('') : true;
	}

	if (typeof name !== 'string') {
		if (typeof value !== 'string') {
			value = '';
		}

		if (generate) {
			return `${value}${node}`;
		} else if (!value) {
			return [];
		} else if (!node) {
			node = document.createTextNode(value);
		} else if (!hydrate && value !== previous) {
			node.nodeValue = value;
		}

		return [node];
	} else if (generate) {
		if (value === true) {
			return `${node} ${name}`;
		}

		return `${node}${value !== false ? ` ${name}="${value}"` : ''}`;
	} else if (hydrate) {
		return node;
	} else if (typeof value === 'boolean') {
		const exists = node.hasAttribute(name);

		if (value && !exists) {
			node.toggleAttribute(name, true);
		} else if (!value && exists) {
			node.removeAttribute(name);
		}
	} else if (value !== previous) {
		node.setAttribute(name, value);
	}

	return node;
}
