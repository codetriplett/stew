import { locate, trigger } from '../manage';

export function create (tag, elm, ctx) {
	let content = tag === undefined ? ctx : [], memory, ref, nodes;

	if (typeof tag === 'function') {
		function callback (input, ...rest) {
			switch (typeof input) {
				case 'string': {
					if (!input) return locate(memory[''][0]);
					const { '': [, node, tag] = [] } = ref[input] || {};
					if (typeof tag !== 'function') return node;
					else if (typeof rest[0] !== 'string') return;
					return node[''][''](...rest);
				}
				case 'undefined': return depth;
				case 'object': break;
				default: return;
			}

			const { '': type, ...props } = input;
			Object.assign(state, props);
			trigger(memory, elm);
		}

		const state = { '': callback };
		const depth = ctx ? ctx[''][1]['']['']() + 1 : 0;
		ref = { '': state };
	} else if (tag !== '') {
		const { '': [,,, dom = []] = [] } = elm || {};

		if (dom.length && (tag || dom[dom.length - 1] instanceof Text)) {
			ref = dom.pop();
			
			if (ref instanceof Element) {
				nodes = [...ref.childNodes].filter(({ nodeType }) => {
					return nodeType !== Node.COMMENT_NODE;
				});
			} else if (tag) {
				ref = dom.pop();
			}
		}

		if (!ref) {
			if (tag) ref = document.createElement(tag);
			else ref = document.createTextNode(content);
		}
	}

	return memory = { '': [content, ref, tag, nodes] };
}
