import { execute, renderImpulse } from './state';

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

function renderElement (ref, props, children, context, document, nodes) {
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

export default function render (layout, context, document, nodes, container, i, map) {
	let ref = container[i + 3] || [];

	if (Array.isArray(layout)) {
		let [tagName, { '': key, ...props } = {}, ...children] = layout;
		let callback, node;
		ref = container[1]?.[key] || ref;
	
		switch (typeof tagName) {
			default: {
				tagName = '';
			}
			case 'number':
			case 'string': {
				callback = renderElement;
				break;
			}
			case 'object': {
				// just handle portal, promise didn't really work well with multiple impulse renders
				// - this should be all that's needed since new ref resembles an element that was already been set up, but not added to parent
				node = tagName;
				nodes = [];
				break;
			}
			case 'function': {
				callback = renderImpulse;
				break;
			}
		}
		
		if (tagName !== ref[0]) {
			if (ref.tagName && tagName.toUpperCase() === ref.tagName) {
				ref = [tagName,, ref, ...ref.childNodes];
			} else {
				ref = [tagName,, node];
			}
		}
	
		if (key) {
			map[key] = ref;
		}
	
		callback(ref, props, children, context, document, nodes, container, i);
	} else {
		switch (typeof layout) {
			default: {
				ref = undefined;
				break
			}
			case 'number': {
				layout = String(layout);
			}
			case 'string': {
				if (ref.nodeValue === undefined) {
					ref = document.createTextNode(layout);
				} else if (layout !== ref.nodeValue) {
					ref.nodeValue = layout;
				}

				nodes.push(ref);
				break;
			}
			case 'object': {
				const { '': callback } = context;
				context = layout;
				layout = callback;
			}
			case 'function': {
				layout = layout(context);
				render(layout, context, document, nodes, container, i, map);
				return;
			}
		}
	}

	return container[i + 3] = ref;
}
