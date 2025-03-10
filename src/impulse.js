
export default function renderImpulse (ref, props, children, context) {
	// keep this simple
	// - render a comment node when nothing is returned from impulse so it has something to attach to if nodes need to be inserted on the next render
	// - this should be self sufficient





	// let [node, info] = ref;

	// if (callback !== info['']?.[0]) {
	// 	[node, info] = ref = [null, { '': [callback, {}] }];
	// }

	// const impulseRef = info[''];
	// const listeners = new Set();
	// const memo = {};
	// let teardowns = [];
	// let previousRef;

	// // create new impulse
	// const impulse = () => {
	// 	if (!ref[1]) {
	// 		return;
	// 	}

	// 	listeners.clear();
	// 	impulses.unshift([impulse, listeners]);
	// 	ref[1] = {};
	// 	const nextLayout = execute(callback, { '': impulseRef[1], ...props });
	// 	const nextRef = render(nextLayout, context, container, i, map, module, document, candidates);
	// 	ref[1] = setup;
	// 	const followups = impulses.shift().splice(2);
	// 	impulseRef.splice(2, impulseRef.length, ...followups.map(execute));

	// 	if (nextRef === previousRef) {
	// 		return;
	// 	}

	// 	[node, info] = ref;
	// 	previousRef = nextRef;

	// 	// reconcile happens here since impulse can trigger on its own
	// 	const sibling = find(container, i);
	// 	insert(newChildRef, parentNode, sibling);

	// 	if (childRef) {
	// 		remove(childRef, parentNode);
	// 	}
	// };




	// 	const setup = (...params) => {
	// 		if (params.length) {
	// 			// forward params before calling
	// 			[callback, context, i, props, children] = params;
	// 			impulse();
	// 			return;
	// 		}

	// 		// teardown
	// 		teardowns.map(execute);

	// 		// unsubscribe
	// 		for (const listener of listeners) {
	// 			listener.delete(impulse);
	// 		}
	// 	};

	// 	[, info] = ref = [null, setup];
	// 	tree.set(impulse, impulses.slice(0));
	// }

	// if (key) {
	// 	container[1][key] = ref;
	// }

	// info(callback, context, i, props, children);
	// return ref;
}
