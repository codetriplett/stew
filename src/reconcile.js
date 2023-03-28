import createImpulse from './activate';
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

	if (sibling) container.insertBefore(node, sibling);
	else container.appendChild(node);
}

export function remove (view, container) {
	let [node,, ...childViews] = view;

	if (node && container) {
		// remove node from DOM and prevent this step for its children
		container.removeChild(node);
		container = undefined;
	}

	// continue removals for children
	for (const childView of childViews) {
		remove(childView, container);
	}
}

function populate (outlines, state, view, dom, hydrateNodes) {
	// backup previous views
	const [, views, ...childViews] = view;

	// update children
	for (let i = outlines.length - 1; i >= 0; i--) {
		reconcile(outlines[i], state, view, i, dom, hydrateNodes);
	}

	// adjust children length to match current state
	const { container } = dom;
	view.splice(outlines.length + 2);

	// remove outdated views
	for (const childView of childViews) {
		if (!childView?.length || view.indexOf(childView) > 1) continue;
		remove(childView, container);
	}

	// remove outdated views
	for (const [name, childView] of Object.entries(views)) {
		if (view.indexOf(childView) < 2) delete views[name];
	}
}

function write (text, view = [], dom, hydrateNodes) {
	const nodeValue = String(text);
	let [node] = view;

	if (!node || !('nodeValue' in node)) {
		// create new text node
		node = frameworks[0][0].createTextNode(nodeValue);
		append(node, dom);
		return [node];
	}

	// claim text node and update if necessary
	if (hydrateNodes) hydrateNodes.pop();
	if (nodeValue !== node.nodeValue) node.nodeValue = nodeValue;
	return view;
};

function update (outline, state, parentView, i, dom, hydrateNodes) {
	if (!outline && outline !== 0) {
		// empty node
		return [];
	} else if (typeof outline === 'object' && !Array.isArray(outline)) {
		// static node
		append(outline, dom);
		return [outline];
	}

	// get candidate view
	const [, views] = parentView;
	let view = hydrateNodes ? hydrateNodes.slice(-1) : parentView[i + 2];

	if (outline === true) {
		// persist node
		if (hydrateNodes) view[1] = {};
		return view || [];
	} else if (!Array.isArray(outline)) {
		// text node
		return write(outline, view, dom, hydrateNodes);
	}

	// element or fragment node
	let [str, obj, ...arr] = outline;
	let [, tagName, key] = str.match(/^\s*(.*?)\s*(?::(.*?))?$/);
	if (!hydrateNodes) views?.[key] || view;
	if (!view) view = [, {}];
	else if (view.length < 2) view[1] = {};
	let [node] = view;

	if (tagName === '') {
		// reject view if it was for an element
		if (node) view = [, {}];
		view.childImpulses = [];
		if (typeof obj === 'function') obj = createImpulse(obj, state, view);
		if (obj) state = obj;
	} else {
		const [[document, updater, defaultProps]] = frameworks;
		tagName = tagName.toLowerCase();

		if (tagName !== node?.tagName?.toLowerCase?.()) {
			// register defaults if not yet done
			if (!Object.prototype.hasOwnProperty.call(defaultProps, tagName)) {
				const example = document.createElement(tagName);
				defaultProps[tagName] = example;
			}

			// create new element and attach to dom
			node = document.createElement(tagName);
			view = [node, {}];
			append(node, dom);
		} else if (hydrateNodes) {
			// claim node and prepare new set for children
			hydrateNodes.pop();
		}

		// update attributes and create new dom reference
		if (typeof obj === 'function') {
			createImpulse(obj, state, view);
		} else if (obj) {
			const prevNames = managedProps.get(node);
			updater(node, obj, prevNames, defaultProps[tagName]);
			managedProps.set(node, Object.keys(obj));
		}

		dom = { container: node };

		if (hydrateNodes) {
			// prepare new set for children
			hydrateNodes = [...node.childNodes];
		}
	}

	// update views and temporarily store new future views in place of node
	if (key) views[key] = view;
	populate(arr, state, view, dom, hydrateNodes);
	return view;
}

export default function reconcile (outline, state, parentView, i, dom, hydrateNodes) {
	if (typeof outline === 'function') {
		// dynamic node
		createImpulse(outline, state, parentView, i, dom, hydrateNodes);
		return;
	}

	const sibling = { ...dom };
	const view = update(outline, state, parentView, i, dom, hydrateNodes);
	let [node] = parentView[i + 2] = view;
	if (!node && dom.node !== sibling.node) node = dom.node;
	if (node) Object.assign(dom, { node, sibling });
}
