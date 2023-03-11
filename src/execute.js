import reconcile, { remove } from './reconcile';

// export const contexts = new WeakMap();
export const frameworks = [];
export const impulses = [];

// TODO: work these out after updates are working properly
export function useEffect (callback) {
	// const [contextCallback] = impulses;
	// const context = contexts.get(contextCallback);
	// // ignore effect if context doesn't exist or if it has been set to ignore it
	// if (!context || context.document.ignoreHooks?.has?.(useEffect)) return;
	// // TODO: maintain a prevState object for each state that stores the previous values when they change
	// // - pass that as the second param after the first time effect has run and is mounted
	// const { ref, teardowns } = context;
	// const hasMounted = !!ref;
	// const teardown = callback();
	// if (teardown) teardowns.push(teardown); 
}

// TODO: see if there is an easy way to update a nodes attributes without causing its children to update
// - what should happen if state object is updated, would all child callbacks need to update?
// - maybe only need to execute child callbacks if any props are added or removed or if the ones they are subscribed to have changed when merging them to existing state object
export default function execute (callback, state, parentView, i, dom, hydrateNodes) {
	// persist parent framework and dom reference object
	const [framework] = frameworks;

	// wrap in setup and teardown steps and store as new callback to subscribe to state property changes
	function impulse (hydrateNodes) {
		// resurface stored framework
		frameworks.unshift(framework);
		impulses.unshift(impulse);
		const viewParam = [];
		let item;
	
		// safely run callback function
		try {
			item = callback(state, viewParam);
		} catch (e) {
			console.error(e);
		}

		// process return value as it normally would before resetting active framework
		const domCopy = { ...dom };
		const prevView = parentView[i + 2];
		reconcile(item, state, parentView, i, dom, hydrateNodes);
		dom = domCopy;

		// remove outdated nodes if needed
		if (!hydrateNodes && prevView?.length && parentView[i + 2] !== prevView) {
			const { container } = dom;
			remove(prevView, container);
		}

		// update view param passed to callback and reset stack
		const newView = parentView[i + 2];
		if (newView) viewParam.push(...newView);
		impulses.shift();
		frameworks.shift();
	}

	// set parent impulse and call for first time
	impulse.parentImpulse = impulses[0];
	impulse(hydrateNodes);
}
