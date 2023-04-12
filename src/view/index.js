import { frameworks } from './dom';
import processFiber, { executeCallback } from '../state/fiber';
import processElement, { processText } from './element';

function appendNode (node, dom) {
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

function prepareCandidate (candidates, dom) {
	if (!candidates.length) return;
	const [candidate] = dom.candidate = Object.assign(candidates?.splice?.(-1), { keyedViews: {} });
	return candidate;
}

function populateChildren (infos, state, parentFiber, parentView, dom) {
	// backup previous views before removing extra child views
	const { container, candidates, doAppend } = dom;
	const [, ...childViews] = parentView;
	let candidate = prepareCandidate(candidates || [], dom);
	parentView.splice(infos.length + 1);

	// update children
	for (let i = infos.length - 1; i >= 0; i--) {
		const prevView = parentView[i + 1];
		const view = reconcileNode(infos[i], state, parentFiber, parentView, i, dom);
		const [node] = parentView[i + 1] = view;

		if (!node) {
			// set first sibling in fragment
			view.sibling = dom.sibling;
			continue;
		} else if (node === candidate) {
			// prepare new candidate
			candidate = prepareCandidate(candidates, dom);
		} else if (doAppend || node !== prevView?.[0]) {
			// append new or moved node
			appendNode(node, dom);
		}
		
		// set as sibling for next child
		dom.sibling = node;
	}

	// remove outdated views
	for (const childView of childViews) {
		if (!childView?.length || parentView.indexOf(childView) > 0) continue;
		removeNode(childView, container);
	}

	// remove outdated keyed views
	const entries = Object.entries(parentView.keyedViews);
	const validEntries = entries.filter(([, childView]) => parentView.indexOf(childView) > 0);
	if (validEntries.length !== entries.length) parentView.keyedViews = Object.fromEntries(validEntries);

	// clear temporary dom props
	Object.assign(dom, { doAppend: false, candidates: undefined });
}

export default function reconcileNode (info, state, parentFiber, parentView, i, dom) {
	// get candidate view
	const { candidate = parentView[i + 1], candidates, doAppend } = dom;

	if (!Array.isArray(info)) {
		switch (typeof info) {
			case 'function': {
				// skip fiber overhead on server
				if (frameworks[0]?.isServer) {
					info = executeCallback(info, state);
					return reconcileNode(info, state, parentFiber, parentView, i, dom);
				}
				
				// dynamic node
				return processFiber(info, state, parentFiber, parentView, i, dom);
			}
			// static node
			case 'object': return [info];
			// text node
			case 'string': case 'number': return processText(info, candidate);
			// persist or ignore node
			default: return info && candidate || [];
		}
	}

	// element or fragment node
	const [str, obj, ...arr] = info;
	const hasKey = ~str.indexOf(':');
	const [, tagName, key] = hasKey ? str.match(/^\s*(.*?)\s*(?::(.*?))?$/) : [, str];
	let view = !candidates && hasKey && parentView.keyedViews[key] || candidate || [];
	let [node] = view;

	if (tagName === '') {
		// reject view if it was for an element, the apply state and/or set doAppend if necessary
		if (node || !('keyedViews' in view)) view = Object.assign([], { keyedViews: {} });
		if (obj) state = obj;
		if (!doAppend) dom.doAppend = view !== candidate;
	} else {
		// create or update node and create new dom object for children
		[node] = view = processElement(tagName.toLowerCase(), obj, view);
		dom = { container: node };
		if (candidates) dom.candidates = [...node.childNodes];
	}

	// update views and temporarily store new future views in place of node
	if (hasKey) parentView.keyedViews[key] = view;
	populateChildren(arr, state, parentFiber, view, dom);
	dom.doAppend = doAppend;
	return view;
}
