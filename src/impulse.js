import render, { remove, reconcile } from './view';
import { schedule } from './state';

export const impulses = [];
export const effects = [];
let prevMemos = [];
let activeInfo;

export function execute (callback, ...params) {
	try {
		return callback?.(...params);
	} catch (err) {
		console.error(err);
	}
}

export function processEffects () {
	for (const effect of effects.splice(0)) {
		const [followup, teardown] = effect;
		const param = typeof teardown === 'function' && execute(teardown);
		effect.splice(0, 2, execute(followup, param), undefined);
	}
}

export function processMemo (callback, ...rest) {
	if (!activeInfo) {
		return;
	}

	const [deps = [], fallback] = rest;
	let memo = activeInfo[activeInfo.length - 1];
	
	if (callback !== memo?.[0]) {
		// if not for an existing effect
		memo = prevMemos.shift() || [undefined];
		activeInfo.push(memo);
	} else if (!memo) {
		memo = [callback];
	}

	let [followup, value] = memo;

	if (!rest.length) {
		// if creating an effect
		effects.push(memo);
		return memo[0] = callback;
	} else if (memo.length > 1 && deps.every((value, i) => value === memo[i + 2])) {
		// if a memo or effect should be maintained
		
		if (followup) {
			effects.pop();
			memo[0] = undefined;
		}
		
		memo.splice(deps.length + 2);
	} else {
		if (!followup) {
			value = callback(value);
			const [, prevValue] = memo.splice(0, 2, undefined, value);

			if (rest.length > 1 && value instanceof Promise) {
				value.then(value => {
					memo[1] = value;
					schedule(new Set([impulse]));
				});
		
				const [impulse] = impulses;
				value = prevValue;
			}
		}

		// if a memo or effect should be updated
		memo.splice(1, memo.length, value, ...deps);
	}

	return value || fallback;



	// stew(() => {}) // useEffect
	// - set memo to ref as [undefined, memo]
	// - return the callback instead of processing it

	// stew(() => {}, []) // useMemo
	// - sets up a memo while also calling callback to get the new value for memo[0]
	// - this and useFetch are the only ones that store deps

	// stew(stew(() => {}), []) // useMemoEffect
	// - have useMemo check if the input function is the same as the last added memo
	// - if so, remove it and set the new up th enew memo like useMemo would do, but don't process callback
	// - callback will remain in memo[1] for followup, just like useEffects that weren't claimed by useMemo



	// if (!children.length) {
	// 	// stew(() => {}) // useEffect
	// 	// TODO: figure out how to allow useEffect with deps
	// 	// - maybe nest stew calls e.g. stew(stew(() => {}), []) <-- this is acceptable and a helper could be made by the user if they want
	// 	// - stew(() => {}) could add the function to a temporary set and return the function
	// 	// - then if stew(() => {}, []) detects one of those functions it can add it to memo[1], where the followups go
	// 	// - then any memos that set followups are scheduled for processing
	// 	// - also queue any useEffects that were unclaimed by ones with deps, and add them as memos
	// 	// - so only useMemo/useFetch, and unclaimed useEffects are stored in memo array
	// 	return useEffect(...children);
	// }

	// // stew(() => {}, []) // useMemo
	// // stew(() => {}, [], {}) // useFetch
	// return useMemo(...children);

	// // this could be used to simulate a type of react lazy loaded component
	// // const Component = stew(() => import('/component'), [], '') // example of asncy loading of component
	// // [Component, {}, ...children] // children serve as placeholder content until Component loads, since it is '' before then
}

// function processMemo (callback, deps) {
// 	let memo = prevMemos.shift();

// 	if (!memo || !deps || deps.some((value, i) => value !== memo[i + 2])) {
// 		const value = memo?.[0];
// 		memo = [value, callback, ...(deps || [])];
// 	}

// 	activeInfo?.push?.(memo);
// 	return memo;
// }

// // used by server and client, but must be inside impulse, and async is only allow on client
// export function useMemo (callback, deps, ...rest) {
// 	if (!activeInfo || !callback || !deps || rest.length && isServer) {
// 		return;
// 	}

// 	const memo = processMemo(callback, deps);
// 	let [value] = memo;
	
// 	if (memo[1]) {
// 		value = callback(value);
// 		const [prevValue] = memo.splice(0, 2, value, undefined);

// 		if (rest.length && value instanceof Promise) {
// 			value.then(value => {
// 				memo[0] = value;
// 				schedule(new Set([impulse]));
// 			});
	
// 			const [impulse] = impulses;
// 			value = prevValue;
// 		}
// 	}

// 	const [fallbackValue] = rest;
// 	return value || fallbackValue;
// }

// // used only on client, and only after any pending updates have been completed 
// export function useEffect (callback, deps) {
// 	if (isServer) {
// 		return;
// 	} else if (callback) {
// 		const memo = processMemo(callback, deps);

// 		if (memo[1]) {
// 			effects.push(memo);
// 		}
// 	} else if (impulses.length || queue.size) {
// 		return new Promise(resolve => effects.push([, resolve]));
// 	}
// }

export default function renderImpulse (info, object, children, context, document, nodes) {
	if (!info[1]) {
		info[1] = [, new Set(), ...impulses.slice(0, -1)];
	}

	// TODO: rename ref params throughout code base
	const { ref, ...props } = object;
	const [, impulse] = info;
	const [parentNode] = nodes;
	const refIndex = ref?.length;
	const nodeIndex = nodes.length;
	let prevNodes;

	const update = () => {
		const [callback,, prevProxy] = info;
		const activeInfoBackup = activeInfo;
		const sibling = prevNodes?.[prevNodes?.length - 1]?.nextSibling;
		impulses.unshift(impulse);
		prevMemos = info.splice(3);
		activeInfo = info;
		const layout = execute(callback, props, ...children) || '';
		const proxy = render(layout, context, document, nodes, info, -1, {});

		if (prevNodes) {
			reconcile(parentNode, nodes.slice(1), prevNodes, sibling);

			if (proxy !== prevProxy) {
				remove(prevProxy, parentNode);
			}

			prevNodes = nodes.splice(1);
		} else {
			prevNodes = nodes.slice(nodeIndex);
			nodes = [parentNode];
		}

		if (Array.isArray(ref)) {
			ref[refIndex] = [...prevNodes];
		}

		activeInfo = activeInfoBackup;
		impulses.shift();
	};

	impulse[0] = update;
	update();
}
