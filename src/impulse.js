import { frameworks } from '.';
import { removeNode } from './dom';
import reconcileNode from './view';

export const fibers = [];

// cleans up old listeners on state properties before impulse refresh or removal
function unsubscribeFibers (fibers) {
	for (const fiber of fibers) {
		const { 0: impulse, s: subscriptionsSet } = fiber;

		// remove impulse from subscriptions
		for (const subscriptions of subscriptionsSet) {
			subscriptions.delete(impulse);
		}

		// reset set and continue unsubscribing children
		subscriptionsSet.clear();
		unsubscribeFibers(fiber.slice(1));
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

// TODO: store hydrate notes in dom
// - activate can clear it before reaction when creating new dom object
// - one last thing to pass all around, especially when it only used initially
export default function processImpulse (callback, state, parentFiber, parentView, i, dom = {}, hydrateNodes) {
	// set up impulse values
	const [framework] = frameworks;
	if (framework.isServer) return executeCallback(callback, state);
	const sibling = { ...dom };
	let view = parentView[i + 1];
	const fiber = view?.fiber || Object.assign([], { d: fibers.length, m: [], s: new Set() });
	let initialized = false;

	// wrap in setup and teardown steps and store as new callback to subscribe to state property changes
	function impulse (newState) {
		// resurface stored framework
		frameworks.unshift(framework);
		fibers.unshift(fiber);
		unsubscribeFibers(fiber.splice(1));
		Object.assign(fiber, { i: 0, t: [] });
		if (newState) state = newState;
		const outline = executeCallback(callback, state);

		// process return value as it normally would before resetting active framework
		if (initialized) dom = { ...sibling };
		reconcileNode(outline, state, parentFiber, parentView, i, dom, hydrateNodes);
		const newView = parentView[i + 1];

		// replace old view if it represents new ref
		if (view !== newView) {
			if (view) removeNode(view, dom.container);
			view = newView;
			view.fiber = fiber;
		}

		// reset stack
		fibers.shift();
		frameworks.shift();
		impulse.q = false;
	}

	// attach to parent, call, then clear hydrate nodes and set as initialized
	fiber[0] = impulse;
	parentFiber.push(fiber);
	impulse();
	dom.sibling = sibling;
	hydrateNodes = undefined;
	initialized = true;
}
