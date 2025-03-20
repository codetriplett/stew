import render from './render';
import { execute } from './impulse';

	// the direct ref holds layout info for quicker validation, e.g. [tagName, domRef, ...previousRefs]
	// the nested ref is for the dom, and it is made up of only dom nodes, e.g. [node, map, ...childElementOrTextNodes]
	// - storing only the element or text nodes allows quicker dom reconciliation
	// - what about impulses that rendered empty, but have teardown functions
	// - fragments have an empty node


// ELEMENT
// [tagName, map, node, ...children]

// FRAGMENT
// ['', map, sibling, ...children]
// - sibling is used to find an attach point if children don't provide a node

// IMPULSE
// [callback, memo, proxy, ...teardowns]
// - proxy is the result of last callback execution

// ATTACHMENT
// [null, null, node, callback]
// - callback serves as teardown if no props are given

// PROMISE
// [promise, null, proxy, ...children]
// - use proxy in place of children refs if proxy is truthy

// PORTAL
// [node, null, null, ...children]



// [type, memo, proxy, childNodeCount, ...childRefs, ...childNodes]
// nodes: the DOM node of elements, and Array of nodes for fragment/promise/impulse
// - impulse will replace its node, and will use empty array if it has no node
// - nodes exist to speed up reconciliation, so it doesn't have to detect the type

// call this when ref is removed from dom
export function teardown (ref, parentNode) {
	if (!Array.isArray(ref)) {
		parentNode?.removeChild?.(ref);
		return;
	}

	const [,, proxy, ...children] = ref;

	if (proxy && !proxy.tagName) {
		teardown(proxy, node);

		for (const [callback] of children) {
			execute(callback);
		}
	} else {
		if (proxy && parentNode) {
			parentNode.removeChild.remove(proxy);
			parentNode = undefiend;
		}

		for (const childRef of children) {
			teardown(childRef, parentNode)
		}
	}
}

export function reconcile (node, nextNodes, prevNodes) {
	let nodeIndex = prevNodes.length - 1;
	let prevNode = prevNodes[nodeIndex];
	let sibling;

	for (let i = nextNodes.length - 1; i >=0; i--) {
		const nextNode = nextNodes[i];

		if (nextNode === prevNode) {
			nodeIndex--;
			prevNode = prevNodes[nodeIndex];
		} else if (sibling) {
			node.insertBefore(nextNode, sibling);
		} else {
			node.appendChild(nextNode);
		}

		sibling = nextNode;
	}
}

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
			if (name === 'style' || name === 'dataset') {
				const object = node[name];

				for (const [name, string] of Object.entries(value)) {
					if (string !== object[name]) {
						object[name] = string;
					}
				}
			} else if (value !== node[name]) {
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
		teardown(childRef, node);
	}

	ref[1] = Object.keys(map).length ? map : null;
	ref.splice(children.length + 3);
	nextNodes.shift();

	if (!node) {
		nodes.push(...nextNodes);
		return;
	}

	reconcile(node, nextNodes, [...node.childNodes]);
	nodes.push(node);
}
