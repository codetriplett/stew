import activate, { teardowns, frameworks } from './activate';
import observe from './observe';

export const memoStack = [];
const memoMap = new WeakMap();
const states = new WeakMap();

// TODO: add fragment to dom object that nodes are appended/inserted to first
// - then append fragment to container if next node skips over an already existing one
// - this way all new nodes are added to the DOM at the same time, avoiding extra reflows
// - would need to skip this step if custom document doesn't have a fragment creator
// - check dom for reusable fragment to know if it is supported
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
	if (teardowns.has(view)) {
		// call teardown function and delete it
		const teardown = teardowns.get(view);
		if (typeof teardown === 'function') teardown();
		teardowns.delete(view);
	}

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

function checkPersistence (view, arr) {
	// extract previous memo and compare with new array
	const [oldArr, ...oldImpulses] = memoMap.get(view) || [];
	const persist = !arr || arr.length === oldArr?.length && arr.every((it, i) => it === oldArr[i]);

	// set new memo
	if (arr) {
		const memo = [arr];
		memoMap.set(view, memo);
		memoStack.unshift(memo);
	}

	// set whether child impulses should persist
	for (const impulse of oldImpulses) {
		impulse.persist = persist;
	}

	return persist && view;
}

function update (outline, state, parentView, i, dom, hydrateNodes) {
	if (!outline && outline !== 0) {
		// empty node
		return [];
	} else if (typeof outline === 'object' && !Array.isArray(outline)) {
		// static node
		if (outline.parentElement) return [];
		append(outline, dom);
		return [outline];
	}

	// get candidate view
	const [, views] = parentView;
	let view = hydrateNodes ? hydrateNodes.slice(-1) : parentView[i + 2];

	if (outline === true) {
		// persist node
		return checkPersistence(view || []);
	} else if (!Array.isArray(outline)) {
		// text node
		return write(outline, view, dom, hydrateNodes);
	}

	// element or fragment node
	const [str, obj, ...arr] = outline;
	const [, tagName, key] = str.match(/^\s*(.*?)\s*(?::(.*?))?$/);
	if (!hydrateNodes) views?.[key] || view;
	if (!view || view.length < 2) view = [, {}];
	let [node] = view;
	let persist;

	if (tagName === '') {
		// reject view if it was for an element
		if (node) view = [, {}];

		if (typeof obj === 'function') {
			// schedule effect
			activate(obj, state, view);
		} else if (Array.isArray(obj)) {
			// memoize fragment
			persist = !!checkPersistence(view, obj);
		} else if (obj && typeof obj === 'object') {
			// create or use existing state
			state = states.get(view) || observe(obj);
			states.set(view, state);
		}
	} else {
		if (node?.tagName?.toLowerCase?.() !== tagName.toLowerCase()) {
			// create new element
			node = frameworks[0][0].createElement(tagName);
			view = [node, {}];
			append(node, dom);
		} else if (hydrateNodes) {
			// claim node and prepare new set for children
			hydrateNodes.pop();
		}

		// update attributes and create new dom reference
		if (typeof obj === 'function') activate(obj, state, view);
		else if (obj) frameworks[0][1](node, obj);
		dom = { container: node };

		if (hydrateNodes) {
			// prepare new set for children
			hydrateNodes = [...node.childNodes];
		}
	}

	// update views and temporarily store new future views in place of node
	if (key) views[key] = view;
	if (!persist) populate(arr, state, view, dom, hydrateNodes);
	if (persist !== undefined) memoStack.shift();
	return view;
}

export default function reconcile (outline, state, parentView, i, dom, hydrateNodes) {
	if (typeof outline === 'function') {
		// dynamic node
		activate(outline, state, parentView, i, dom, hydrateNodes);
		return;
	}

	const sibling = { ...dom };
	const view = update(outline, state, parentView, i, dom, hydrateNodes);
	let [node] = parentView[i + 2] = view;
	if (!node && dom.node !== sibling.node) node = dom.node;
	if (node) Object.assign(dom, { node, sibling });
}
