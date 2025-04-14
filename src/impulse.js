import { execute } from '.';
import { isServer } from './document';
import render, { remove, reconcile } from './view';
import { queue, schedule } from './state';

export const impulses = [];
const effects = [];
let prevMemos = [];
let activeInfo;

export function processEffects () {
	for (const effect of effects.splice(0)) {
		const [teardown, callback] = effect;
		const param = teardown && execute(teardown);
		effect.splice(0, 2, execute(callback, param), undefined);
	}
}

/*

// if promise, wait and repalce value in memo when it resolves
const data = useMemo(() => {
	return fetch(...);
}, [...]);

*/

function processMemo (callback, deps) {
	let memo = prevMemos.shift();

	if (!memo || !deps || deps.some((value, i) => value !== memo[i + 2])) {
		const value = memo?.[0];
		memo = [value, callback, ...(deps || [])];
	}

	activeInfo?.push?.(memo);
	return memo;
}

// used by server and client, but must be inside impulse, and async is only allow on client
export function useMemo (callback, deps, ...rest) {
	if (!activeInfo || !callback || !deps || rest.length && isServer) {
		return;
	}

	const memo = processMemo(callback, deps);
	let [value] = memo;
	
	if (memo[1]) {
		value = callback(value);
		const [prevValue] = memo.splice(0, 2, value, undefined);

		if (rest.length && value instanceof Promise) {
			value.then(value => {
				memo[0] = value;
				schedule(new Set([impulse]));
			});
	
			const [impulse] = impulses;
			value = prevValue;
		}
	}

	const [fallbackValue] = rest;
	return value || fallbackValue;
}

// used only on client, and only after any pending updates have been completed 
export function useEffect (callback, deps) {
	if (isServer) {
		return;
	} else if (callback) {
		const memo = processMemo(callback, deps);

		if (memo[1]) {
			effects.push(memo);
		}
	} else if (impulses.length || queue.size) {
		return new Promise(resolve => effects.push([, resolve]));
	}
}

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
		const activeRefBackup = activeInfo;
		const sibling = prevNodes?.[prevNodes?.length - 1]?.nextSibling;
		prevMemos = info.splice(3);
		activeInfo = info;
		impulses.unshift(impulse);
		const layout = execute(callback, props, ...children) || '';
		const proxy = render(layout, context, document, nodes, info, -1, {});
		impulses.shift();
		activeInfo = activeRefBackup;

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

		if (ref) {
			ref[refIndex] = prevNodes[0];
		}
	};

	impulse[0] = update;
	update();
}
