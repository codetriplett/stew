import processFiber, { executeCallback, fibers } from '../state/fiber';
import processElement, { processText } from './element';
import { isClient, frameworks, converters } from './dom';

export function appendNode (node, dom) {
	const { container, sibling } = dom;

	if (sibling && sibling.previousSibling !== node) {
		container.insertBefore(node, sibling);
	} else if (!sibling && container.lastChild !== node) {
		container.appendChild(node);
	}
}

const { TEXT_NODE, COMMENT_NODE } = isClient ? window.Node : {};

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
	const candidates = [...container.childNodes].filter(({ nodeType }) => nodeType !== COMMENT_NODE).reverse();

	return candidates.map(node => {
		return node.nodeType === TEXT_NODE ? [node] : Object.assign([node], { keyedViews: {} });
	});
}

export function populateChildren (infos, state, parentView, dom) {
	// backup previous views before removing extra child views
	const { container, candidates = [], doAppend } = dom;
	const [parentNode, ...childViews] = parentView;
	const newKeyedViews = {};
	parentView.splice(infos.length + 1);

	// update children
	for (let i = infos.length - 1; i >= 0; i--) {
		const prevView = parentView[i + 1];
		const view = reconcileNode(infos[i], state, parentView, i, dom);
		const [node] = parentView[i + 1] = view;
		if (view.key) newKeyedViews[view.key] = view;

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

	// replace keyed views and shift hydration nodes to previous views
	parentView.keyedViews = newKeyedViews;
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
				if (fibers.isServer) {
					info = executeCallback(info, [], state);
					return reconcileNode(info, state, parentView, i, dom);
				}
				
				// dynamic node
				return processFiber(info, state, parentView, i, dom);
			}
			// static node
			case 'object': {
				// return empty or previously initialized node
				if (!info) return [];
				if (candidate && !candidates?.[0]) return candidate;

				// create initial node
				const [[document,,, containerTag]] = frameworks;
				const [[headingDepth, convert, vars, promises]] = converters;
				const isHydrating = candidate && 'keyedViews' in candidate;
				const view = isHydrating ? candidate : Object.assign([document.createElement(containerTag)], { keyedViews: {} });
				const [container] = view;
				const node = convert(info, vars, container, headingDepth);
				promises.push(node);
				return view;
			}
			// text node
			case 'string': case 'number': return processText(info, candidate);
		}

		// persist or ignore node
		return info && candidate || [];
	}

	// element or fragment node
	const [tagName, object, ...children] = info;
	const { key, ref, ...props } = object || {};
	const isFragment = tagName === '';
	let view = (!candidates && key ? parentView.keyedViews[key] : candidate) || [];
	let [node] = view;

	if (isFragment) {
		// reject view if it was for an element, the apply state and/or set doAppend if necessary
		if (node || !('keyedViews' in view)) view = Object.assign([], { keyedViews: {} });
		if ('context' in props) state = props.context;
		if (!candidates && !doAppend) dom.doAppend = view !== candidate;
	} else {
		// create or update node and create new dom object for children
		[node] = view = processElement(tagName, props, view);
		dom = { container: node };
		if (candidates) dom.candidates = prepareCandidates(node);
	}

	// set key and ref, then update views
	if (ref) ref[0] = dom.container;
	populateChildren(children, state, view, dom);
	if (isFragment) dom.doAppend = doAppend;
	else dom.candidates = undefined;
	view.key = key;
	return view;
}
