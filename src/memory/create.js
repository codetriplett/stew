import { locate, trigger } from '../manage';

const registry = new WeakMap();

export function create (tag, elm, ctx, params) {
	let content = tag === undefined ? ctx : [], props = {}, memory, ref, nodes;

	if (typeof tag === 'function') {
		function callback (input, ...rest) {
			switch (typeof input) {
				case 'string': {
					if (!input) return locate(memory[''][0]);
					const { '': [, ref] } = memory;
					const { '': [, node, tag] = [] } = ref[input] || {};
					if (typeof tag !== 'function') return node;
					else if (typeof rest[0] !== 'string') return;
					return node[''][''](...rest);
				}
				case 'undefined': return depth;
				case 'object': break;
				default: return;
			}

			Object.assign(state, input, ...rest)[''] = callback;
			trigger(memory, elm);
		}

		const state = { '': callback };
		let depth = ctx[''][1]['']['']();
		depth = depth === undefined ? 0 : depth + 1;
		content = undefined;
		ref = { '': state };
	} else if (tag !== '') {
		const { '': [,,, dom = []] = [] } = elm || {};

		if (!Array.isArray(dom)) {
			for (const { name, value } of dom.attributes) {
				if (Object.prototype.hasOwnProperty.call(params, name)) {
					props[name] = value === '' ? true : value;
				}
			}

			ref = dom;
			params = {};

			if (registry.has(ref)) {
				content = registry.get(ref);
			} else {
				registry.set(ref, content);
				ref.innerHTML = '';
			}
		} else if (dom.length && (tag || dom[dom.length - 1] instanceof Text)) {
			ref = dom.pop();
			
			if (ref instanceof Element) {
				nodes = [...ref.childNodes].filter(({ nodeType }) => {
					return nodeType !== Node.COMMENT_NODE;
				});
			} else if (tag) {
				ref = dom.pop();
			}
		}

		if (ref) {
			for (const [name, value] of Object.entries(params)) {
				if (!name.startsWith('on')) props[name] = value;
			}
		} else if (tag) {
			ref = document.createElement(tag);
		} else {
			ref = document.createTextNode(content);
		}
	} else if (params) {
		nodes = [];
	}

	return memory = { '': [content, ref, tag, nodes], ...props };
}
