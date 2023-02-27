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

export default function execute (callback, context, _refs) {
	// store or retrieve context
	if (context) {
		context = { ...context, refs: _refs };
		contexts.set(callback, context);
	} else {
		context = contexts.get(callback);
		_refs = context.refs;
	}

	// set up ties to this callback function
	if (!context) return;
	const { state } = context;
	const refs = [{}];
	let template;
	Object.assign(context, { _refs, refs, teardowns: [] });
	stack.unshift(callback);

	// safely run callback function
	try {
		template = callback(state, refs[0]);
	} catch (e) {
		console.error(e);
	}

	// resolve template and update nodes
	Object.assign(context, { hasMounted: true, _refs: undefined });
	stack.shift();
	const node = resolve(template, context, _refs);
	const refsSet = new Set(refs.slice(1));
	const _refsSet = new Set(_refs.slice(1));

	// TODO: work these out after updates are working properly
	// - hooks are tied to a callback using the stack as the key and are stored in contexts under that key
	for (const node of refsSet) {
		if (_refsSet.has(node)) {
			// trigger update hook
		} else {
			// trigger mount hook
			
		}
	}

	for (const node of _refsSet) {
		if (!refsSet.has(node)) {
			// trigger unmount hook
		}
	}

	return node;
}
