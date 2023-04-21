import reconcileNode, { appendNode, removeNode } from '../view';
import { frameworks } from '../view/dom';

export const fibers = [];

// recursively call teardowns
function deactivateFiber (fiber) {
	const { view, teardowns, registry } = fiber;
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
	for (const teardown of teardowns) {
		if (typeof teardown === 'function') teardown();
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

export default function processFiber (callback, state, parentView, i, dom) {
	// get previous fiber
	const [parentFiber] = fibers;
	let fiber = parentView[i + 1]?.fiber;

	if (!fiber) {
		// allows dynamic section of layout to update with the same context it had originally
		function impulse (context) {
			// update context
			if (context) [callback, state, dom] = context;
			else dom.sibling = parentView.slice(i + 2).find(view => view[0] || view.sibling)?.[0];

			// resurface stored framework and process callback
			frameworks.unshift(framework);
			fibers.unshift(fiber);
			teardowns.splice(0);
			const oldChildFibers = fiber.splice(1);
			const info = executeCallback(callback, memos, state);
			const view = reconcileNode(info, state, parentView, i, dom);

			// handle updates here if impulse is reacting to dispatch
			if (!context) {
				const prevView = fiber.view;
				impulse.queued = false;

				// replace old view if it represents new ref
				if (view !== prevView) {
					removeNode(prevView, dom.container);
					const [node] = parentView[i + 1] = view;
					if (node) appendNode(node, dom);
				}
			}

			// teardown and unsubscribe disconnected child fibers
			for (const childFiber of oldChildFibers) {
				if (!~fiber.indexOf(childFiber)) deactivateFiber(childFiber);
			}

			// reset stack
			fibers.shift();
			frameworks.shift();
			view.fiber = fiber;
			return fiber.view = view;
		}

		// create new view and set fiber
		const [framework] = frameworks;
		const memos = [];
		const teardowns = [];
		fiber = Object.assign([impulse], { depth: fibers.length, registry: new Set(), teardowns });
	}

	// ready callback and call impulse with state
	parentFiber.push(fiber);
	return fiber[0]([callback, state, dom]);
}
