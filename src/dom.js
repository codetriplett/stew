import reconcileNode from './view';

export function appendNode (node, dom) {
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

// recursively call teardowns
export function deactivateFiber (fiber) {
	const { m: memos, t: teardowns } = fiber;

	// deactivate children
	for (const childFiber of fiber.slice(1)) {
		deactivateFiber(childFiber);
	}

	// call teardown
	for (const index of teardowns) {
		const [teardown, ...prevDeps] = memos[index];
		if (typeof teardown === 'function') teardown(prevDeps);
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
		const { impulse } = childView;
		if (impulse) deactivateFiber(impulse);
	}
}

export function populateChildren (outlines, state, parentFiber, view, dom, hydrateNodes) {
	// backup previous views
	const [, ...childViews] = view;

	// update children
	for (let i = outlines.length - 1; i >= 0; i--) {
		reconcileNode(outlines[i], state, parentFiber, view, i, dom, hydrateNodes);
	}

	// adjust children length to match current state
	const { container } = dom;
	view.splice(outlines.length + 1);

	// remove outdated views
	for (const childView of childViews) {
		if (!childView?.length || view.indexOf(childView) > 0) continue;
		removeNode(childView, container);
	}

	// remove outdated keyed views
	const entries = Object.entries(view.keyedViews);
	const validEntries = entries.filter(([, childView]) => view.indexOf(childView) > 0);
	if (validEntries.length !== entries.length) view.keyedViews = Object.fromEntries(validEntries);
}
