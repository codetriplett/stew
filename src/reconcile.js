import execute, { teardowns, frameworks } from './execute';
import observe from './observe';

// TODO: add fragment to dom object that nodes are appended/inserted to first
// - then append fragment to container if next node skips over an already existing one
// - this way all new nodes are added to the DOM at the same time, avoiding extra reflows
// TODO: test portals which are created by adding a stew() call within another template
// - if stew() call uses a selector for a node that exists outside the current controlled dom space, it will have a parentElement and won't get appended here
// - test that the nested template will have access to the parent state
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
		const teardown = teardowns.get(view);
		if (typeof teardown === 'function') teardown();
	}

	let [node,, ...childViews] = view;

	if (node) {
		container.removeChild(node);
		return;
	}

	for (const childView of childViews) {
		remove(childView, container);
	}
}

function populate (outlines, state, view, dom, hydrateNodes) {
	// backup previous views
	const [, refs, ...prevChildren] = view;

	// update children
	for (let i = outlines.length - 1; i >= 0; i--) {
		reconcile(outlines[i], state, view, i, dom, hydrateNodes);
	}

	// adjust children length to match current state
	const { container } = dom;
	view.splice(outlines.length + 2);

	// remove outdated views
	for (const childView of prevChildren) {
		// skip if previous view is still active or if it is empty
		if (!childView?.length || view.indexOf(childView) > 1) continue;
		remove(childView, container);
	}

	// remove outdated refs
	for (const [name, ref] of Object.entries(refs)) {
		if (view.indexOf(ref) < 2) delete refs[name];
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

// TODO: store hooks state using index or key tied to parent view
// - if a useEffect is called for the first time on that index or key, do not pass it the prevState (treat as mount)
// - if a useEffect is not called by had been the previous time, run its teardown function
function update (outline, state, parentView, i, dom, hydrateNodes) {
	if (!outline && outline !== 0 || outline === true) {
		// empty node
		return [];
	} else if (typeof outline === 'object' && !Array.isArray(outline)) {
		// static node
		if (outline.parentElement) return [];
		append(outline, dom);
		return [outline];
	}

	// get candidate view
	const [, refs, ...views] = parentView;
	let view = hydrateNodes ? hydrateNodes.slice(-1) : views[i];

	if (!Array.isArray(outline)) {
		// text node
		return write(outline, view, dom, hydrateNodes);
	}

	// element or fragment node
	const [str, obj, ...arr] = outline;
	const [, tagName, key] = str.match(/^\s*(.*?)\s*(?::(.*?))?$/);
	const isFragment = tagName === '';
	if (!view) view = refs?.[key] || [];
	if (view.length < 2) view[1] = {};
	let node;

	if (!isFragment) {
		[node] = view;

		if (node?.tagName?.toLowerCase?.() !== tagName.toLowerCase()) {
			// create new element
			view[0] = node = frameworks[0][0].createElement(tagName);
			append(node, dom);
		} else if (hydrateNodes) {
			// claim node and prepare new set for children
			hydrateNodes.pop();
		}

		// update attributes and create new dom reference
		if (typeof obj === 'function') execute(obj, state, view);
		else if (obj) frameworks[0][1](node, obj);
		dom = { container: node };

		if (hydrateNodes) {
			// prepare new set for children
			hydrateNodes = [...node.childNodes];
		}
	} else if (typeof obj === 'function') {
		execute(obj, state, view);
	} else if (obj) {
		// create new state
		state = observe(obj);
	}
	
	// update refs and temporarily store new future views in place of node
	if (key) refs[key] = view;
	populate(arr, state, view, dom, hydrateNodes);
	return view;
}

export default function reconcile (outline, state, parentView, i, dom, hydrateNodes) {
	if (typeof outline === 'function') {
		// dynamic node
		execute(outline, state, parentView, i, dom, hydrateNodes);
		return;
	}

	const sibling = { ...dom };
	const view = update(outline, state, parentView, i, dom, hydrateNodes);
	let [node] = parentView[i + 2] = view;
	if (!node && dom.node !== sibling.node) node = dom.node;
	if (node) Object.assign(dom, { node, sibling });
}
