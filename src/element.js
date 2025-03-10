import render from './lite';

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

// call this when a ref is removed or shifts within dom
export function gather (ref, nodes = []) {
	if (!Array.isArray(ref)) {
		return;
	}

	const [tagName,, proxy, ...children] = ref;

	if (Array.isArray(proxy)) {
		gather(proxy, nodes);
	} else if (tagName === '') {
		for (const childRef of children) {
			gather(childRef, nodes);
		}
	} else if (proxy) {
		nodes.push(proxy);
	}

	return nodes;
}

// call this when ref is removed from dom
export function teardown (ref) {
	if (!Array.isArray(ref)) {
		return;
	}

	const [,, proxy, ...children] = ref;

	if (Array.isArray(proxy)) {
		teardown(proxy);

		for (const callback of children) {
			execute(callback);
		}
	} else {
		for (const childRef of children) {
			teardown(childRef)
		}
	}
}

// [type, memo, proxy, ...children]
// - 

// ['',        { ...map }, <node>, ...childRefs]
// ['tagName', { ...map }, siblingRef, ...childRefs]
// - sibling is used mainly by impulse to insert new nodes into dom when it had none previously

// - fragments store the index of thier first childNode within their container
// - impulses, and other dynamic refs, will store their ref as childNode
export default function renderElement (ref, props, children, context, document, container) {
	let [tagName, memo, node] = ref;
	const isFragment = tagName === '';
	
	if (!node && !isFragment) {
		const { shadowrootmode } = props;

		if (typeof shadowrootmode === 'boolean' && tagName?.toUpperCase?.() === 'TEMPLATE') {
			node = parentNode.shadowRoot || parentNode.attachShadow({ mode: shadowrootmode });
		} else {
			node = document.createElement(typeof tagName === 'number' ? `h${tagName}` : tagName);
		}

		ref[2] = node;
	}

	if (isFragment) {
		context = { ...context, ...props };
	} else {
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
	}

	const map = {};
	const removeRefs = new Set(ref.slice(3));
	const nextNodes = [];

	for (let i = children.length - 1; i >= 0; i--) {
		const childNode = render(children[i], context, document, ref, i, map);
		const childRef = ref[i + 3];

		if (childRef) {
			removeRefs.delete(childRef);
			
			if (Array.isArray(childNode)) {
				nextNodes.push(...childNode);
			} else {
				nextNodes.push(childNode);
			}
		} else if (!memo) {
			// shift items in hydration mode for next child to process
			ref.splice(i + 3, 0, undefined);
		}
	}

	for (const childRef of removeRefs) {
		const childNodes = gather(childRef);
		teardown(childRef);
	
		for (const childNode of childNodes) {
			node.removeChild(childNode);
		}
	}

	ref[1] = map;
	ref.splice(children.length + 3);

	if (isFragment) {
		return nextNodes;
	}

	// reconcile child nodes of elements once all have been gathered and the old ones are removed
	if (nextNodes.length) {
		const prevNodes = [...node.childNodes];
		let prevNode = prevNodes.pop();
		let sibling;

		for (const nextNode of nextNodes) {
			if (nextNode === prevNode) {
				prevNode = prevNodes.pop();
			} else if (sibling) {
				node.insertBefore(nextNode, sibling);
			} else {
				node.appendChild(nextNode);
			}

			sibling = nextNode;
		}
	}

	return node;






	// TODO: only reconcile children of elements, not fragments
	// - use gather to get the fragment and impulse nodes
	// - only impulse needs to insert a placeholder comment when it empty, since it can update itself after element's reconciliation

	// let nodeIndex = childNodes.length - 1;

	// if (!sibling) {
	// 	if (isFragment && !nextNodes.length) {

	// 	}

	// 	sibling = nextNodes.shift();

	// 	if (sibling !== childNodes[nodeIndex]) {
	// 		node.appendChild(sibling);
	// 	} else {
	// 		nodeIndex--;
	// 	}
	// }

	// for (const [i, childRef] of nextRefs.entries().reverse()) {


	// 	if (childNode !== sibling) {
	// 		node.insertBefore(childNode, sibling);
	// 	}

	// 	sibling = childNode.previousSibling;
	// }

	// ref.splice(1, map, isFragment ? sibling : node, ...nextRefs);
}


	// TODO: store fragment and impulse refs in previousNodes so they can be processed
	// - these are the only ones stored as arrays, so they can be detected and gathered into a documentFragment or so that teardowns can be detected
	// - update logic below to check for the difference while setting and looping through nodes
