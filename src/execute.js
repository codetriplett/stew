import reconcile from './reconcile';

export const contexts = new WeakMap();
export const documents = [];
export const callbacks = [];

// TODO: work these out after updates are working properly
// - hooks are tied to a callback using the stack as the key and are stored in contexts under that key
// - populate() needs to check refs against prevRefs of its children to know if mount/update or unmount needs to fire
export function useEffect (callback) {
	const [contextCallback] = callbacks;
	const context = contexts.get(contextCallback);
	// ignore effect if context doesn't exist or if it has been set to ignore it
	if (!context || context.document.ignoreHooks?.has?.(useEffect)) return;
	// TODO: maintain a prevState object for each state that stores the previous values when they change
	// - pass that as the second param after the first time effect has run and is mounted
	const { ref, teardowns } = context;
	const hasMounted = !!ref;
	const teardown = callback();
	if (teardown) teardowns.push(teardown); 
}

// TODO: see if there is an easy way to update a nodes attributes without causing its children to update
// - what should happen if state object is updated, would all child callbacks need to update?
// - maybe only need to execute child callbacks if any props are added or removed or if the ones they are subscribed to have changed when merging them to existing state object

// TODO: contexts need to reference nextSibling
// - needed to insert nodes into parent when they are shown after the inital render
// - if nextSibling is another reaction function, look at its nextSibling until a non-reaction is found
// - if a nextSibling is empty, it means it is the last node and should be appended in parent
// - so context needs to store parentElement as well
export default function execute (callback, ...params) {
	let context, item, state, containerRef, i, container, childNodes, oldKeyedRefs, ref;

	// store or retrieve context
	if (params.length) {
		context = { parentCallback: callbacks[0], document: documents[0], ref: [, {}], params };
		contexts.set(callback, context);
	} else {
		context = contexts.get(callback);
	}

	// set up ties to this callback function
	if (!context) return;
	({ document, ref, params: [state, containerRef, i, container, childNodes, oldKeyedRefs] } = context);
	context.teardowns = [];
	documents.unshift(document);
	callbacks.unshift(callback);

	// safely run callback function
	try {
		item = callback(state, ref);
	} catch (e) {
		console.error(e);
	}

	// resolve template and update nodes
	documents.shift();
	callbacks.shift();
	ref = reconcile(item, state, containerRef, i, container, childNodes, oldKeyedRefs);
	return context.ref = ref;
}
