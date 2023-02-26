import resolve from './resolve';

export const contexts = new WeakMap();
export const stack = [];

// TODO: work these out after updates are working properly
// - hooks are tied to a callback using the stack as the key and are stored in contexts under that key
export function useEffect (callback) {
	const [contextCallback] = stack;
	const context = contexts.get(contextCallback);
	// ignore effect if context doesn't exist or if it has been set to ignore it
	if (!context || context.document.ignoreHooks?.has?.(useEffect)) return;
	// TODO: maintain a prevState object for each state that stores the previous values when they change
	// - pass that as the second param after the first time effect has run and is mounted
	const { hasMounted, teardowns } = context;
	const teardown = callback();
	if (teardown) teardowns.push(teardown); 
}

export default function execute (callback, context, i) {
	// store or retrieve context
	if (context) {
		context = { ...context, hasMounted: false, previousRefs: {}, currentRefs: {} };
		contexts.set(callback, context);
	} else {
		context = contexts.get(callback);
	}

	// set up ties to this callback function
	if (!context) return;
	const { state, previousRefs, currentRefs } = context;
	let template;
	context.teardowns = [];
	stack.unshift(callback);

	// safely run callback function
	try {
		template = callback(state, currentRefs);
	} catch (e) {
		console.error(e);
	}

	// resolve template and update nodes
	context.hasMounted = true;
	stack.shift();
	const node = resolve(template, context, i);
	const currentSet = new Set(Object.values(currentRefs));
	const previousSet = new Set(Object.values(previousRefs));

	// TODO: work these out after updates are working properly
	// - hooks are tied to a callback using the stack as the key and are stored in contexts under that key
	for (const node of currentSet) {
		if (previousSet.has(node)) {
			// trigger update hook
		} else {
			// trigger mount hook
			
		}
	}

	for (const node of previousSet) {
		if (!currentSet.has(node)) {
			// trigger unmount hook
		}
	}

	return node;
}
