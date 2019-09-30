import { fetch } from './fetch';
import { evaluate } from './evaluate';

export function render (state, view, name, node) {
	const iterative = typeof name !== 'string';
	const generate = typeof node === 'string';
	const hydrate = !generate && !state['.'][0][''];
	let previous;

	if (!Array.isArray(view)) {
		let { '': [tag, ...children], key = [['.']], ...attributes } = view;
		let iterate = false;

		if (Array.isArray(tag)) {
			const scope = fetch(tag[0], state);

			if (scope === undefined || scope === null || scope === false) {
				return generate ? '' : [];
			} else if (scope !== true) {
				state = scope;
				iterate = Array.isArray(scope);
			}
			
			tag = children.shift();
			attributes['data--'] = iterate ? [`${name}-`, ...key] : [name];
		} else {
			name = '';
		}

		if (!iterate) {
			state = [state];
		}

		return state.reduceRight((siblings, state) => {
			if (siblings.length) {
				node = generate ? siblings : siblings[0].previousNode;
			}

			const id = node && node.tagName && node.getAttribute('data--');
			const index = id && id.split('-')[0] || node && '';
			let element;

			if (generate) {
				element = `<${tag}`;
			} else {
				element = index === name ? node : document.createElement(tag);
			}

			for (const name in attributes) {
				element = render(state, attributes[name], name, element);
			}

			if (generate) {
				return `${element}>${children.reduceRight((node, item, i) => {
					return render(state, item, i, node);
				}, `${children.length ? `</${tag}>` : ''}${node}`)}`;
			}

			children.reduceRight((node, item, i) => {
				const candidate = node ? node.previousNode : element.lastChild;
				const children = render(state, item, i, candidate);

				return children.reduceRight((node, child) => {
					if (!child.parentElement) {
						if (node) {
							element.insertBefore(child, node);
						} else {
							element.appendChild(child);
						}
					}

					return child;
				}, node);
			}, undefined);

			siblings.unshift(element);
			return siblings;
		}, generate ? '' : []);
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
