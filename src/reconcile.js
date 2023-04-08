import activate, { impulses, deactivate } from './activate';
import { frameworks } from '.';

export const managedProps = new WeakMap();

// TODO: add fragment to dom object that nodes are appended/inserted to first
// - then append fragment to container if next node skips over an already existing one
// - this way groups of nodes are added to the DOM at once, avoiding extra reflows
// - would need to skip this step if custom document doesn't have a fragment creator
// - check dom for reusable fragment to know if it is supported
// - !!! may not even provide benefit if reflow waits for all main thread activity to finish anyway
function append (node, dom) {
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

export function remove (view, container) {
	let [node, ...childViews] = view;

	if (node) {
		// remove node from DOM
		container.removeChild(node);
		return;
	}

	// remove nodes from fragment
	for (const childView of childViews) {
		remove(childView, container);
		const { impulse } = childView;
		if (impulse) deactivate(impulse);
	}
}

function populate (outlines, state, view, dom, hydrateNodes) {
	// backup previous views
	const [, ...childViews] = view;

	// update children
	for (let i = outlines.length - 1; i >= 0; i--) {
		reconcile(outlines[i], state, view, i, dom, hydrateNodes);
	}

	// adjust children length to match current state
	const { container } = dom;
	view.splice(outlines.length + 1);

	// remove outdated views
	for (const childView of childViews) {
		if (!childView?.length || view.indexOf(childView) > 0) continue;
		remove(childView, container);
	}

	// remove outdated keyed views
	const entries = Object.entries(view.keyedViews);
	const validEntries = entries.filter(([, childView]) => view.indexOf(childView) > 0);
	if (validEntries.length !== entries.length) view.keyedViews = Object.fromEntries(validEntries);
}

function write (text, view = [], dom) {
	const nodeValue = String(text);
	let [node] = view;

	if (!node || !('nodeValue' in node)) {
		// create new text node
		const [[document]] = frameworks;
		node = document.createTextNode(nodeValue);
		append(node, dom);
		return [node];
	}

	// claim text node and update if necessary
	if (nodeValue !== node.nodeValue) node.nodeValue = nodeValue;
	return view;
};

export function update (node, attributes, updater, defaultProps, ignoreRef) {
	const prevNames = managedProps.get(node);
	updater(node, attributes, prevNames, defaultProps[node.tagName.toLowerCase()], ignoreRef);
	managedProps.set(node, Object.keys(attributes));
}

function process (outline, state, parentView, i, dom, hydrateNodes) {
	if (!outline && outline !== 0) {
		// empty node
		return [];
	} else if (typeof outline === 'object' && !Array.isArray(outline)) {
		// static node
		append(outline, dom);
		return [outline];
	}

	// get candidate view
	const { doAppend } = dom;
	let view = hydrateNodes ? hydrateNodes.slice(-1) : parentView[i + 1];

	if (outline === true) {
		// persist node
		if (!view) return [];
		const [node] = view;
		if (doAppend && node) append(node, dom);
		return view;
	} else if (!Array.isArray(outline)) {
		// text node
		const textView = write(outline, view, dom);
		if (hydrateNodes && textView === view) hydrateNodes.pop();
		return textView;
	}

	// element or fragment node
	let [str, obj, ...arr] = outline;
	const indexedView = view;
	const hasKey = ~str.indexOf(':');
	let [, tagName, key] = hasKey ? str.match(/^\s*(.*?)\s*(?::(.*?))?$/) : [, str];
	if (!hydrateNodes) view = hasKey && parentView.keyedViews[key] || indexedView || [];
	let [node] = view;

	if (tagName === '') {
		// reject view if it was for an element
		if (node || !('keyedViews' in view)) view = Object.assign([], { keyedViews: {} });
		if (typeof obj === 'function') obj = activate(obj, state, view);
		if (obj) state = obj;

		// flag dom as needing to append children if fragment moves
		if (!doAppend) dom.doAppend = view !== indexedView;
	} else {
		const [[document, updater, defaultProps]] = frameworks;
		tagName = tagName.toLowerCase();

		if (!hydrateNodes && !('keyedViews' in view) || tagName !== node?.tagName?.toLowerCase?.()) {
			// register defaults if not yet done
			if (!Object.prototype.hasOwnProperty.call(defaultProps, tagName)) {
				const example = document.createElement(tagName);
				defaultProps[tagName] = example;
			}

			// create new element and attach to dom
			node = document.createElement(tagName);
			view = Object.assign([node], { keyedViews: {} });
		} else if (hydrateNodes) {
			// claim node and prepare new set for children
			hydrateNodes.pop();
			view.keyedViews = {};
		}

		// update attributes, append and create new dom reference
		if (typeof obj === 'function') activate(obj, state, view);
		else if (obj) update(node, obj, updater, defaultProps);
		if (doAppend || view !== indexedView) append(node, dom);
		dom = { container: node };

		if (hydrateNodes) {
			// prepare new set for children
			hydrateNodes = [...node.childNodes];
		}
	}

	// update views and temporarily store new future views in place of node
	if (hasKey) parentView.keyedViews[key] = view;
	populate(arr, state, view, dom, hydrateNodes);
	dom.doAppend = doAppend;
	return view;
}

export default function reconcile (outline, state, parentView, i, dom, hydrateNodes) {
	if (typeof outline === 'function') {
		// dynamic node
		activate(outline, state, parentView, i, dom, hydrateNodes);
		return;
	}

	// dom node
	const sibling = { ...dom };
	const view = process(outline, state, parentView, i, dom, hydrateNodes);
	let [node] = parentView[i + 1] = view;
	if (!node && dom.node !== sibling.node) node = dom.node;
	if (node) Object.assign(dom, { node, sibling: undefined });
	const { impulse } = view;

	// clear memo props and run teardowns
	if (impulse && impulse !== impulses[0]) {
		deactivate(impulse);
	}
}
