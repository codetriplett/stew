import stew from '..';
import processFiber, { executeCallback } from '../state/fiber';
import processElement, { processText } from './element';

export function appendNode (node, dom) {
	const { container, sibling } = dom;

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

export function prepareCandidates (container) {
	const childNodes = [...container.childNodes].reverse();
	return childNodes.map(node => Object.assign([node], { keyedViews: {} }));
}

export function populateChildren (infos, state, parentView, dom) {
	// backup previous views before removing extra child views
	const { container, candidates = [], doAppend } = dom;
	const [parentNode, ...childViews] = parentView;
	const newKeyedViews = parentView.newKeyedViews = {};
	parentView.splice(infos.length + 1);

	// update children
	for (let i = infos.length - 1; i >= 0; i--) {
		const prevView = parentView[i + 1];
		const view = reconcileNode(infos[i], state, parentView, i, dom);
		const [node] = parentView[i + 1] = view;

		if (!node) {
			// set first sibling in fragment and update candidate
			view.sibling = dom.sibling;
			continue;
		} else if (view === candidates[0]) {
			// claim candidate
			candidates.shift();
		} else if (doAppend || node !== prevView?.[0]) {
			// append new or moved node
			appendNode(node, dom);
		}
		
		// set as sibling for next child
		dom.sibling = node;
	}

	// replace keyed refs and shift hydration nodes to previous views
	Object.assign(parentView, { keyedViews: newKeyedViews, newKeyedViews: undefined });
	if (parentNode && candidates.length) childViews.push(...candidates);

	// remove outdated views
	for (const childView of childViews) {
		if (!childView?.length || parentView.indexOf(childView) > 0) continue;
		removeNode(childView, container);
	}
}

export default function reconcileNode (info, state, parentView, i, dom) {
	// get candidate view
	const { candidates, doAppend } = dom;
	const candidate = candidates?.[0] || parentView[i + 1]

	if (!Array.isArray(info)) {
		switch (typeof info) {
			case 'function': {
				// skip fiber overhead on server
				if (stew.isServer) {
					info = executeCallback(info, state);
					return reconcileNode(info, state, parentView, i, dom);
				}
				
				// dynamic node
				return processFiber(info, state, parentView, i, dom);
			}
			// static node
			case 'object': return info ? [info] : [];
			// text node
			case 'string': case 'number': return processText(info, candidate);
		}

		// persist or ignore node
		return info && candidate || [];
	}

	// element or fragment node
	const [str, obj, ...arr] = info;
	const keyIndex = str.indexOf(':');
	const hasKey = keyIndex !== -1;
	const isFragment = str === '' || keyIndex === 0;
	let view = !candidates && hasKey && parentView.keyedViews[str] || candidate || [];
	let [node] = view;

	if (isFragment) {
		// reject view if it was for an element, the apply state and/or set doAppend if necessary
		if (node || !('keyedViews' in view)) view = Object.assign([], { keyedViews: {} });
		if (obj) state = obj;
		if (!candidates && !doAppend) dom.doAppend = view !== candidate;
	} else {
		// create or update node and create new dom object for children
		const tagName = hasKey ? str.slice(0, keyIndex) : str;
		[node] = view = processElement(tagName.toLowerCase(), obj, view);
		dom = { container: node };
		if (candidates) dom.candidates = prepareCandidates(node);
	}

	// update views and temporarily store new future views in place of node
	if (hasKey) parentView.newKeyedViews[str] = view;
	populateChildren(arr, state, view, dom);
	if (isFragment) dom.doAppend = doAppend;
	else dom.candidates = undefined;
	return view;
}
