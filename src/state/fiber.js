import { frameworks } from '../view/dom';
import reconcileNode, { removeNode } from '../view';

export const fibers = [];

// recursively call teardowns
function deactivateFiber (fiber) {
	const { memos, teardowns, registry } = fiber;

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

export default function processFiber (callback, state, parentFiber, parentView, i, dom) {
	// get previous fiber
	let fiber = parentView[i + 1]?.fiber;

	if (!fiber) {
		// allows dynamic section of layout to update with the same context it had originally
		function impulse () {
			// resurface stored framework
			frameworks.unshift(framework);
			fibers.unshift(fiber);
			Object.assign(fiber, { index: 0, teardowns: [] });
			const { callback, state } = fiber;
			const oldChildFibers = fiber.splice(1);
			const info = executeCallback(callback, state);

			// process dynamic section and overwrite previously set dom siblings
			if (prevView) dom.sibling = parentView.slice(i + 1).find(view => view[0] || view.sibling)?.[0];
			const view = reconcileNode(info, state, fiber, parentView, i, dom);

			if (prevView) {
				// replace old view if it represents new ref
				if (view !== prevView) {
					removeNode(prevView, dom.container);
					parentView[i + 1] = view;
				}

				// teardown and unsubscribe disconnected child fibers
				for (const childFiber of oldChildFibers) {
					if (!fiber.indexOf(childFiber)) deactivateFiber(childFiber);
				}
			}

			// reset stack
			fibers.shift();
			frameworks.shift();
			impulse.queued = false;
			return prevView = view;
		}

		// create new view and set fiber
		const [framework] = frameworks;
		let prevView;
		fiber = Object.assign([impulse], { depth: fibers.length, memos: [], registry: new Set() });
	}

	// ready callback and call impulse with state
	parentFiber.push(fiber);
	Object.assign(fiber, { callback, state });
	return fiber[0](state);
}
