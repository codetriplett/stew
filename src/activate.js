import reconcile, { memoStack, remove } from './reconcile';

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
	const [framework] = frameworks;
	const [parentImpulse] = impulses;
	const [parentMemo] = memoStack;
	const childImpulses = [];
	const detachedImpulses = [];
	let initialized = false;

	// wrap in setup and teardown steps and store as new callback to subscribe to state property changes
	function impulse () {
		// resurface stored framework
		frameworks.unshift(framework);
		impulses.unshift(impulse);
		memoStack.unshift();
		const oldChildImpulses = childImpulses.splice(0);
		let outline;
		impulse.detachedIndex = 0;

		// safely run callback function
		try {
			outline = callback(state);
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
		} else if (parentView) {
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
		return outline;
	}

	// set parent impulse and call for first time, except for effects
	parentMemo?.push?.(impulse);
	parentImpulse?.childImpulses?.push?.(impulse);
	Object.assign(impulse, { parentImpulse, childImpulses, detachedImpulses, subscriptionsSet: new Set() });
	const value = impulse(hydrateNodes);
	hydrateNodes = undefined;
	initialized = true;
	return value;
}
