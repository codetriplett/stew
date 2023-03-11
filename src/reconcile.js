import execute, { frameworks } from './execute';
import observe from './observe';

// TODO: add fragment to dom object that nodes are appended/inserted to first
// - then append fragment to container if next node skips over an already existing one
// - this way all new nodes are added to the DOM at the same time, avoiding extra reflows
// TODO: test portals which are created by adding a stew() call within another template
// - if stew() call uses a selector for a node that exists outside the current controlled dom space, it will have a parentElement and won't get appended here
// - test that the nested template will have access to the parent state
function append (node, dom) {
	if (node.parentElement) return;
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

	if (node) {
		container.removeChild(node);
		return;
	}

	for (const childView of childViews) {
		remove(childView, container);
	}
}

function populate (items, state, view, dom, hydrateNodes) {
	// backup previous views
	const prevChildren = view.slice(2);

	// update children
	for (let i = items.length - 1; i >= 0; i--) {
		reconcile(items[i], state, view, i, dom, hydrateNodes);
	}

	// adjust children length to match current state
	const { container } = dom;
	view.splice(items.length + 2);

	// remove outdated views
	for (const childView of prevChildren) {
		// skip if previous view is still active or if it is empty
		if (!childView?.length || view.indexOf(childView) > 1) continue;
		remove(childView, container);
	}
	
	// TODO: check for setups and teardowns
	// - setups are triggered when callback is found in items at an index that didn't have one before
	// - teardowns are triggered when callback is not found in items at an index that had one before
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

// TODO: store hooks state using index or key tied to parent view
// - if a useEffect is called for the first time on that index or key, do not pass it the prevState (treat as mount)
// - if a useEffect is not called by had been the previous time, run its teardown function
function update (item, state, parentView, i, dom, hydrateNodes) {
	if (!item && item !== 0 || item === true) {
		// empty node
		return [];
	} else if (typeof item === 'object' && !Array.isArray(item)) {
		// static node
		append(item, dom);
		return [item];
	}

	// get candidate view
	let [futureViews, pastViews, ...views] = parentView;
	let view = hydrateNodes ? hydrateNodes.slice(-1) : views[i];

	if (!Array.isArray(item)) {
		// text node
		return write(item, view, dom, hydrateNodes);
	}

	// element or fragment node
	const [str, obj, ...arr] = item;
	const [, tagName, key] = str.match(/^\s*(.*?)\s*(?::(.*?))?$/);
	const isFragment = tagName === '';
	if (!view) view = pastViews?.[key] || [];
	let node;

	if (!isFragment) {
		[node] = view;

		if (node?.tagName?.toLowerCase?.() !== tagName.toLowerCase()) {
			// create new element
			node = frameworks[0][0].createElement(tagName);
			append(node, dom);
		}

		// update attributes and create new dom reference
		if (obj) frameworks[0][1](node, obj);
		dom = { container: node };

		// claim node and prepare new set for children
		if (hydrateNodes) {
			const { childNodes } = node;
			hydrateNodes.pop();
			hydrateNodes = [...childNodes]
		}
	} else if (obj) {
		// create new state
		state = observe(obj);
	}
	
	// update refs and temporarily store new future views in place of node
	if (key) futureViews[key] = view;
	futureViews = view[0] = {};
	populate(arr, state, view, dom, hydrateNodes);
	view.splice(0, 2, node, futureViews);
	return view;
}

export default function reconcile (item, state, parentView, i, dom, hydrateNodes) {
	if (typeof item === 'function') {
		// dynamic node
		execute(item, state, parentView, i, dom, hydrateNodes);
		return;
	}

	const sibling = { ...dom };
	const view = update(item, state, parentView, i, dom, hydrateNodes);
	let [node] = parentView[i + 2] = view;
	if (!node && dom.node !== sibling.node) node = dom.node;
	if (node) Object.assign(dom, { node, sibling });
}
