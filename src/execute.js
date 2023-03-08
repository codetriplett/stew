import reconcile from './reconcile';

// export const contexts = new WeakMap();
export const frameworks = [];
export const impulses = [];

// TODO: work these out after updates are working properly
// - hooks are tied to a callback using the stack as the key and are stored in contexts under that key
// - populate() needs to check refs against prevRefs of its children to know if mount/update or unmount needs to fire
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

// TODO: contexts need to reference nextSibling
// - needed to insert nodes into parent when they are shown after the inital render
// - if nextSibling is another reaction function, look at its nextSibling until a non-reaction is found
// - if a nextSibling is empty, it means it is the last node and should be appended in parent
// - so context needs to store parentElement as well
export default function execute (callback, state, parentView, i, dom, hydrateNodes) {
	// persist parent framework and dom reference object
	const [framework] = frameworks;
	dom = { ...dom };

	// wrap in setup and teardown steps and store as new callback to subscribe to state property changes
	function impulse () {
		// resurface stored framework
		frameworks.unshift(framework);
		impulses.unshift(impulse);
		const view = [];
		let item;
	
		// safely run callback function
		try {
			item = callback(state, view);
		} catch (e) {
			console.error(e);
		}

		// TODO: have hooks store echo properties on impulse function
		// - allows things like persisting custom values between function calls, or setting teardown callback
		// - how does a second pass of execute not overwrite the previous impulse?

		// process return value as it normally would before resetting active framework
		reconcile(item, state, parentView, i, { ...dom }, hydrateNodes);
		const newView = parentView[i + 2];
		if (newView) view.push(...newView);
		impulses.shift();
		frameworks.shift();
	}

	// set parent impulse and call for first time
	impulse.parentImpulse = impulses[0];
	impulse();
}






	
// 	// store or retrieve context
// 	if (context.length) {
// 		context.unshift({
// 			parentKeyedRefs: impulses[0],
// 			customDocument: documents[0],
// 			customUpdater: updaters[0]
// 		});

// 		contexts.set(callback, context);
// 	} else {
// 		context = contexts.get(callback);
// 		if (!context) return;
// 	}

// 	// set up ties to this callback function
// 	let [options, state, containerRef, i, prevRefs, container, sibling] = context;
// 	const { customDocument, customUpdater } = options;
// 	const newKeyedRefs = {};
// 	options.teardowns = [];
// 	documents.unshift(customDocument);
// 	updaters.unshift(customUpdater);
// 	impulses.unshift(newKeyedRefs);

// 	// resolve template and update nodes
// 	sibling = reconcile(item, state, containerMemory, i, prevRefs, container, sibling, newKeyedRefs);
// 	// TODO: store key in sibling and store that in options here
// 	// - if key changes during a reaction, delete the old one from the keyedRefs
// 	context[4] = containerMemory[1];
// 	documents.shift();
// 	updaters.shift();
// 	impulses.shift();
// 	return sibling;
// }
