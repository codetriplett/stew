import resolve from './resolve';

export const contexts = new WeakMap();
export const relatives = new WeakMap();
export const stack = [];

// TODO: work these out after updates are working properly
// - hooks are tied to a callback using the stack as the key and are stored in contexts under that key
// - populate() needs to check refs against prevRefs of its children to know if mount/update or unmount needs to fire
export function useEffect (callback) {
	const [contextCallback] = stack;
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

export default function execute (callback, context, containerRef, i) {
	// store or retrieve context
	if (context) {
		const ref = containerRef[i + 2];
		context = { ...context, ref };
		contexts.set(callback, context);
	} else {
		context = contexts.get(callback);
	}

	// set up ties to this callback function
	if (!context) return;
	const { state, ref } = context;
	let template;
	context.teardowns = [];
	relatives.set(callback, stack[0]);
	stack.unshift(callback);

	// safely run callback function
	try {
		template = callback(state, ref);
	} catch (e) {
		console.error(e);
	}

	// resolve template and update nodes
	stack.shift();
	return resolve(template, context, ref);
}
