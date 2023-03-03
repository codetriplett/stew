import resolve from './resolve';

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
export default function execute (callback, context, containerRef, i, sibling) {
	// store or retrieve context
	if (context) {
		const ref = containerRef[i + 2] || [, {}];
		containerRef[i + 2] = ref;
		context = { ...context, parentCallback: callbacks[0], document: documents[0], ref, i };
		contexts.set(callback, context);
	} else {
		context = contexts.get(callback);
		({ i } = context);
	}

	// set up ties to this callback function
	if (!context) return;
	const { document, state, ref } = context;
	let template;
	context.teardowns = [];
	documents.unshift(document);
	callbacks.unshift(callback);

	// safely run callback function
	try {
		template = callback(state, ref[1]);
	} catch (e) {
		console.error(e);
	}

	// resolve template and update nodes
	documents.shift();
	callbacks.shift();
	return resolve(template, context, ref, i, sibling);
}
