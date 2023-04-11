import { frameworks } from './dom';
import processFiber, { executeCallback } from '../state/fiber';
import processElement, { processText } from './element';

function appendNode (node, dom) {
	const { container } = dom;
	let sibling;

	// find the next valid sibling node
	while (dom && !sibling) {
		({ node: sibling, sibling: dom } = dom);
	}

	if (sibling && sibling.previousSibling !== node) {
		container.insertBefore(node, sibling);
	} else if (!sibling && container.lastChild !== node) {
		container.appendChild(node);
	}
}

export function removeNode (view, container) {
	let [node, ...childViews] = view;

	if (node) {
		// remove node from DOM
		container.removeChild(node);
		return;
	}

	// remove nodes from fragment
	for (const childView of childViews) {
		removeNode(childView, container);
	}
}

function populateChildren (infos, state, parentFiber, parentView, dom, hydrateNodes) {
	// backup previous views
	const [, ...childViews] = parentView;

	// update children
	for (let i = infos.length - 1; i >= 0; i--) {
		const sibling = { ...dom };
		const view = reconcileNode(infos[i], state, parentFiber, parentView, i, dom, hydrateNodes);
		let [node] = parentView[i + 1] = view;
		if (!node && dom.node !== sibling.node) node = dom.node;
		if (node) Object.assign(dom, { node, sibling: undefined });
	}

	// adjust children length to match current state
	const { container } = dom;
	parentView.splice(infos.length + 1);

	// remove outdated views
	for (const childView of childViews) {
		if (!childView?.length || parentView.indexOf(childView) > 0) continue;
		removeNode(childView, container);
	}

	// remove outdated keyed views
	const entries = Object.entries(parentView.keyedViews);
	const validEntries = entries.filter(([, childView]) => parentView.indexOf(childView) > 0);
	if (validEntries.length !== entries.length) parentView.keyedViews = Object.fromEntries(validEntries);
}

export default function reconcileNode (info, state, parentFiber, parentView, i, dom, hydrateNodes) {
	// get candidate view
	const { doAppend } = dom;
	let indexedView = hydrateNodes ? hydrateNodes.slice(-1) : parentView[i + 1];

	if (!Array.isArray(info)) {
		switch (typeof info) {
			case 'string':
			case 'number': {
				// text node
				const view = processText(info, indexedView, dom);
				if (doAppend || view !== indexedView) appendNode(view[0], dom);
				else if (hydrateNodes && view === indexedView) hydrateNodes.pop();
				return view;
			}
			case 'object': {
				// static node
				if (doAppend) appendNode(info, dom);
				return [info];
			}
			case 'function': {
				// skip fiber overhead on server
				if (frameworks[0]?.isServer) {
					info = executeCallback(info, state);
					return reconcileNode(info, state, parentFiber, parentView, i, dom, hydrateNodes);
				}
				
				// dynamic node
				return processFiber(info, state, parentFiber, parentView, i, dom, hydrateNodes);
			}
			default: {
				// either skip or persist node
				if (!info || !indexedView) return [];
				const [node] = indexedView;
				if (doAppend && node) appendNode(node, dom);
				return indexedView;
			}
		}
	}

	// element or fragment node
	const [str, obj, ...arr] = info;
	const hasKey = ~str.indexOf(':');
	const [, tagName, key] = hasKey ? str.match(/^\s*(.*?)\s*(?::(.*?))?$/) : [, str];
	let view = !hydrateNodes && hasKey && parentView.keyedViews[key] || indexedView || [];
	let [node] = view;

	if (tagName === '') {
		// reject view if it was for an element
		if (node || !('keyedViews' in view)) view = Object.assign([], { keyedViews: {} });
		if (obj) state = obj;

		// flag dom as needing to append children if fragment moves
		if (!doAppend) dom.doAppend = view !== indexedView;
	} else {
		// create or update node
		[node] = view = processElement(tagName.toLowerCase(), obj, view, hydrateNodes);

		// update dom
		if (doAppend || view !== indexedView) appendNode(node, dom);
		dom = { container: node };

		if (hydrateNodes) {
			// prepare new set for children
			hydrateNodes = [...node.childNodes];
		}
	}

	// update views and temporarily store new future views in place of node
	if (hasKey) parentView.keyedViews[key] = view;
	populateChildren(arr, state, parentFiber, view, dom, hydrateNodes);
	dom.doAppend = doAppend;
	return view;
}
