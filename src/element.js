import render, { remove, reconcile } from './view';

export default function renderElement (ref, props, children, context, document, nodes) {
	let [tagName, memo, node] = ref;

	if (!node && tagName !== '') {
		const { shadowrootmode } = props;

		if (typeof shadowrootmode === 'boolean' && tagName?.toUpperCase?.() === 'TEMPLATE') {
			node = parentNode.shadowRoot || parentNode.attachShadow({ mode: shadowrootmode });
		} else {
			node = document.createElement(typeof tagName === 'number' ? `h${tagName}` : tagName);
		}

		ref[2] = node;
	}

	if (node) {
		for (const [name, value] of Object.entries(props)) {
			switch (name) {
				case 'style':
				case 'dataset': {
					const object = node[name];

					for (const [name, string] of Object.entries(value)) {
						if (string !== object[name]) {
							object[name] = string;
						}
					}

					continue;
				}
				case 'ref': {
					value.push(node);
					continue;
				}
			}

			if (value !== node[name]) {
				node[name] = value;
			}
		}
	} else {
		context = { ...context, ...props };
	}

	const map = {};
	const removeRefs = new Set(ref.slice(3));
	const nextNodes = [node];

	for (const [i, childLayout] of children.entries()) {
		const childRef = render(childLayout, context, document, nextNodes, ref, i, map);

		if (childRef) {
			removeRefs.delete(childRef);
		} else if (memo === undefined) {
			// shift items in hydration mode for next child to process
			ref.splice(i + 3, 0, undefined);
		}
	}

	for (const childRef of removeRefs) {
		remove(childRef, node);
	}

	ref[1] = Object.keys(map).length ? map : null;
	ref.splice(children.length + 3);
	nextNodes.shift();

	if (!node) {
		nodes.push(...nextNodes);
		return;
	}

	reconcile(node, nextNodes, [...node.childNodes]);

	if (tagName !== node) {
		nodes.push(node);
	}
}
