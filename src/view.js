/**
 * @license MIT
 * Copyright (c) 2023 Jeff Triplett
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import renderElement from './element';
import renderImpulse from './impulse';
import { unsubscribe } from './state';

export function remove (ref, parentNode) {
	if (!Array.isArray(ref)) {
		if (ref && parentNode) {
			parentNode.removeChild(ref);
		}

		return;
	}

	const [,, node, ...children] = ref;

	if (Array.isArray(node)) {
		const [, subscriptions, proxy] = node;
		unsubscribe(subscriptions);
		remove(proxy, parentNdoe);

		for (const [teardown] of children) {
			execute(teardown);
		}
	} else {
		ref[1] = undefined;

		if (node && parentNode) {
			parentNode.removeChild(node);
			parentNode = undefined;
		}

		for (const childRef of children) {
			remove(childRef, parentNode)
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
	let ref = container[i + 3] || [];

	if (!Array.isArray(layout)) {
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
				const { '': convert } = context;
				layout = [convert, layout];
				return render(layout, context, document, nodes, container, i, map);
			}
			case 'function': {
				layout = layout(context);
				return render(layout, context, document, nodes, container, i, map);
			}
		}
	} else {
		let [tagName, object, ...children] = layout;
		const { '': key, ...props } = object || {};
		let callback = renderElement;
		let node;
		ref = container[1]?.[key] || ref;
	
		switch (typeof tagName) {
			case 'object': {
				if (tagName) {
					// just handle portal, promise didn't really work well with multiple impulse renders
					// - this should be all that's needed since new ref resembles an element that was already been set up, but not added to parent
					node = tagName;
					nodes = [];
					break;
				}
			}
			case 'undefined':
			case 'boolean': {
				tagName = '';
				break;
			}
			case 'function': {
				callback = renderImpulse;
				break;
			}
		}
		
		if (tagName !== ref[0]) {
			if (!node && ref.tagName && tagName.toUpperCase() === ref.tagName) {
				ref = [tagName,, ref, ...ref.childNodes];
			} else {
				ref = [tagName,, node];
			}
		}
	
		if (key) {
			map[key] = ref;
		}

		callback(ref, props, children, context, document, nodes, container, i);
	}

	return container[i + 3] = ref;
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
