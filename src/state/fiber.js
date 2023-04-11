import { frameworks } from '../view/dom';
import reconcileNode, { removeNode } from '../view';

export const fibers = [];

// recursively call teardowns
function deactivateFiber (fiber) {
	const { v: view, m: memos, t: teardowns, r: registry } = fiber;
	fiber[0] = undefined;
	view.fiber = undefined;

	// unsubscribe from all state properties
	for (const subscriptions of registry) {
		subscriptions.delete(fiber);
	}

	// deactivate children
	for (const childFiber of fiber.slice(1)) {
		deactivateFiber(childFiber);
	}

	// call teardowns
	for (const index of teardowns) {
		const [teardown, ...prevDeps] = memos[index];
		if (typeof teardown === 'function') teardown(prevDeps);
	}
}

// safely call user defined code
export function executeCallback (callback, ...params) {
	try {
		return callback(...params);
	} catch (e) {
		console.error(e);
	}
}

export default function processFiber (callback, state, parentFiber, parentView, i, dom = {}, hydrateNodes) {
	// get previous fiber
	let fiber = parentView[i + 1]?.fiber;

	if (!fiber) {
		// wrap in setup and teardown steps and store as new callback to subscribe to state property changes
		function impulse () {
			// resurface stored framework
			frameworks.unshift(framework);
			fibers.unshift(fiber);
			Object.assign(fiber, { i: 0, t: [] });
			const { c, s } = fiber;
			const oldChildFibers = fiber.splice(1);
			const outline = executeCallback(c, s);

			// process return value as it normally would before resetting active framework
			if (view) dom = { ...sibling };
			const newView = reconcileNode(outline, state, parentFiber, parentView, i, dom, hydrateNodes);
			const newChildFibers = new Set(fiber.slice(1));

			// replace old view if it represents new ref
			if (view !== newView) {
				if (view) removeNode(view, dom.container);
				parentView[i + 1] = fiber.v = view = newView;
				view.fiber = fiber;
			}

			// TODO: check for child impulses to deactivate here instead of in removeNode
			for (const childFiber of oldChildFibers) {
				if (!newChildFibers.has(childFiber)) deactivateFiber(childFiber);
			}

			// reset stack
			fibers.shift();
			frameworks.shift();
			impulse.q = false;
			hydrateNodes = undefined;
			return view;
		}

		// create new view and set fiber
		const [framework] = frameworks;
		const sibling = { ...dom, doAppend: false };
		let state, view;
		fiber = Object.assign([impulse], { d: fibers.length, m: [], r: new Set() });
	}

	// ready callback and call impulse with state
	parentFiber.push(fiber);
	Object.assign(fiber, { c: callback, s: state });
	return fiber[0](state);
}
