import renderElement from './element';
import renderImpulse, { execute } from './impulse';
import renderProgram from './program';
import { unsubscribe } from './state';

export function remove (info, parentNode) {
	if (!Array.isArray(info)) {
		if (info && parentNode) {
			parentNode.removeChild(info);
		}

		return;
	}

	const [, impulse, proxy,,, ...children] = info;

	if (Array.isArray(impulse)) {
		unsubscribe(impulse);
		remove(proxy, parentNode);

		for (const [, teardown] of children) {
			if (typeof teardown === 'function') {
				execute(teardown);
			}
		}
	} else {
		info[1] = undefined;

		if (proxy && parentNode) {
			parentNode.removeChild(proxy);
			parentNode = undefined;
		}

		for (const childInfo of children) {
			remove(childInfo, parentNode)
		}
	}
}

export function reconcile (node, nextNodes, prevNodes, sibling) {
	let nodeIndex = prevNodes.length - 1;
	let prevNode = prevNodes[nodeIndex];

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

export default function render (layout, context, document, nodes, container, i, map) {
	let info = container[i + 3];

	if (!Array.isArray(layout)) {
		switch (typeof layout) {
			default: {
				info = null;
				break
			}
			case 'number': {
				layout = String(layout);
			}
			case 'string': {
				if (info?.nodeValue === undefined) {
					info = document.createTextNode(layout);
				} else if (layout !== info.nodeValue) {
					info.nodeValue = layout;
				}

				nodes.push(info);
				break;
			}
			case 'object': {
				if (!layout) {
					info = undefined;
					break;
				}

				// TODO: use key to get and store to a different info object
				const { '': convert } = context['']?.default || {};
				const { '': key, ...props } = layout;
				context = props;
				layout = nodes[0].tagName === 'CANVAS' ? renderProgram : convert || (() => {});
			}
			case 'function': {
				layout = layout(context, nodes[0]);
				return render(layout, context, document, nodes, container, i, map);
			}
		}
	} else {
		let [tagName, object, ...children] = layout;
		let { '': key, ...props } = object || {};
		let callback = renderElement;
		let node = null;
		info = container[1]?.[key] || info || [];
	
		switch (typeof tagName) {
			case 'object': {
				if (tagName === info[2]) {
					info[0] = tagName;
				} else if (tagName) {
					info = tagName;
					tagName = info.tagName;
				}

				break;
			}
			case 'undefined':
			case 'boolean': {
				// TODO: have [true, {}, ...] indicate static content
				// - nodes will be shallow hydrated, only pick node without processing children
				// - can also be used client side to memoize and keep previous content (boolean is result of memo check)
				tagName = null;
				break;
			}
			case 'function': {
				if (!object) {
					props = object;
				}

				callback = renderImpulse;
				break;
			}
		}
		
		if (tagName !== info[0]) {
			if (!node && info.tagName && tagName?.toUpperCase?.() === info.tagName) {
				info = [tagName,, info, ...info.childNodes];
				// TODO: make sure comment nodes don't mess up the hydration order (I think it skips over mismatches)
			} else {
				info = [tagName,, node];
			}
		}

		callback(info, props, children, context, document, nodes);
		layout[0] = info[2];
	
		if (key) {
			map[key] = info;
		}
	}

	return container[i + 3] = info;
}

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
