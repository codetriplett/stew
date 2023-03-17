import reconcile, { memoStack, remove } from './reconcile';
import { schedule } from './observe';

export const teardowns = new WeakMap();
export const frameworks = [];
export const impulses = [];

export function unsubscribe (impulses) {
	return impulses.filter(impulse => {
		// read props and skip the rest if impulse persists
		const { subscriptionsSet, childImpulses, persist } = impulse;
		if (persist) return true;

		// remove impulse from subscriptions
		for (const subscriptions of subscriptionsSet) {
			subscriptions.delete(impulse);
		}

		// reset set and continue unsubscribing children
		subscriptionsSet.clear();
		unsubscribe(childImpulses);
	});
}

export default function activate (callback, state, parentView, i, dom, hydrateNodes) {
	// persist parent framework and dom reference object
	const isEffect = state && i === undefined && parentView[0] === undefined;
	const [framework] = frameworks;
	const [parentImpulse] = impulses;
	const [parentMemo] = memoStack;
	const childImpulses = [];
	let initialized = false;

	// wrap in setup and teardown steps and store as new callback to subscribe to state property changes
	function impulse () {
		// resurface stored framework
		frameworks.unshift(framework);
		impulses.unshift(impulse);
		memoStack.unshift();
		const oldChildImpulses = childImpulses.splice(0);
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

			if (initialized && oldView?.length && newView !== oldView) {
				// remove old nodes and subscriptions
				const { container } = dom;
				remove(oldView, container);
			}
		} else if (isEffect) {
			// store teardown
			teardowns.set(parentView, outline);
		} else if (state) {
			// process attribute update
			const [node] = parentView;
			const [, updater] = framework;
			updater(node, outline);
		}

		// clean up ephemeral impulses and reset stack
		const persistentImpulses = unsubscribe(oldChildImpulses);
		childImpulses.push(...persistentImpulses);
		memoStack.shift();
		impulses.shift();
		frameworks.shift();
	}

	// delay effect until after render
	if (isEffect) {
		schedule(new Set([impulse]));
		return;
	}

	// set parent impulse and call for first time, except for effects
	parentMemo?.push?.(impulse);
	parentImpulse?.childImpulses?.push?.(impulse);
	impulse.parentImpulse = parentImpulse;
	impulse.childImpulses = childImpulses;
	impulse.subscriptionsSet = new Set();
	impulse(hydrateNodes);
	hydrateNodes = undefined;
	initialized = true;
}
