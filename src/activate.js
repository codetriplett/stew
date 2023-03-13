import reconcile, { remove } from './reconcile';
import { schedule } from './observe';

export const teardowns = new WeakMap();
export const memory = new WeakMap();
export const frameworks = [];
export const impulses = [];

export function unsubscribe (view) {
	if (memory.has(view)) {
		const oldImpulse = memory.get(view);
		const { subscriptionsSet } = oldImpulse;

		for (const subscriptions of subscriptionsSet) {
			subscriptions.delete(oldImpulse);
		}
	}
}

export default function activate (callback, state, parentView, i, dom, hydrateNodes) {
	// persist parent framework and dom reference object
	const isEffect = i === undefined && parentView[0] === undefined;
	const [framework] = frameworks;
	let iteration = 0;

	// wrap in setup and teardown steps and store as new callback to subscribe to state property changes
	function impulse (hydrateNodes) {
		// resurface stored framework
		frameworks.unshift(framework);
		impulses.unshift(impulse);
		let outline;
	
		// safely run callback function
		try {
			const param = isEffect ? [teardowns.get(parentView), ...parentView.slice(1)] : state;
			outline = callback(param);
		} catch (e) {
			console.error(e);
		}

		if (i !== undefined) {
			// process return value as it normally would before resetting active framework
			const domCopy = { ...dom };
			const oldView = parentView[i + 2];
			reconcile(outline, state, parentView, i, dom, hydrateNodes);
			const newView = parentView[i + 2];
			dom = domCopy;

			if (iteration === 0) {
				// clear subscriptions of old impulse
				unsubscribe(oldView);
			} else if (oldView?.length && newView !== oldView) {
				// remove old nodes and subscriptions
				const { container } = dom;
				remove(oldView, container, true);
			}
			
			// add memory
			if (newView) memory.set(newView, impulse);
		} else {
			const [node] = parentView;

			if (node) {
				// process attribute update
				const [, updater] = framework;
				updater(node, outline);
			} else {
				teardowns.set(parentView, outline);
			}
		}

		// reset stack
		impulses.shift();
		frameworks.shift();
		iteration++;
	}

	// delay effect until after render
	if (isEffect) {
		schedule(new Set([impulse]));
		return;
	}

	// set parent impulse and call for first time, except for effects 
	impulse.parentImpulse = impulses[0];
	impulse.subscriptionsSet = new Set();
	impulse(hydrateNodes);
}
