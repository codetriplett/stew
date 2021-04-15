import { trigger } from '../manage';

export function create (tag, elm, ctx) {
	let content = tag === undefined ? ctx : [], memory, ref, nodes;

	if (typeof tag === 'function') {
		function callback (input) {
			switch (typeof input) {
				case 'string': {
					if (!input) return ctx && ctx[''][1][''][''];
					const [, node, type] = ref[input] || [];
					return typeof type === 'function' ? node[''][''] : node;
				}
				case 'object': break;
				default: return;
			}

			const { '': type, ...props } = input;
			Object.assign(state, props);
			trigger(memory, elm);
		}

		const state = { '': callback };
		content = undefined;
		ref = { '': state };
	} else if (tag !== '') {
		const { '': [,,, dom = []] = [] } = elm || {};

		if (dom.length && (tag || dom[dom.length - 1] instanceof Text)) {
			ref = dom.pop();
			
			if (ref instanceof Element) {
				// TODO: figure out how to process comment nodes
				// - these represent empty children and breaks between text nodes
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
