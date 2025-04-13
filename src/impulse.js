import { execute } from '.';
import { isServer } from './document';
import render, { remove, reconcile } from './view';
import { queue, schedule } from './state';

export const impulses = [];
const effects = [];
const refs = [];
let prevMemos;

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

function processMemo (callback, deps, prevMemos, effects) {
	let memo = prevMemos.shift();
	let prevValue;

	if (!memo || !deps || deps.some((value, i) => value !== memo[i + 2])) {
		prevValue = memo?.[0];
		memo = [prevValue, callback, ...(deps || [])];
	}
	
	let [value] = memo;
	refs[0].push(memo);

	if (memo[1]) {
		if (effects) {
			effects.push(memo);
		} else {
			value = callback(value);

			if (value instanceof Promise) {
				value.then(value => {
					memo[0] = value;
					schedule(new Set([impulse]));
				});

				const [impulse] = impulses;
				value = prevValue;
			}

			memo.splice(0, 2, value, undefined);
		}
	}

	return value;
}

export function useMemo (callback, deps) {
	if (refs.length === 0) {
		return;
	} else if (!callback) {
		callback = () => ({});
	}

	return processMemo(callback, deps, prevMemos);
}

export function onRender (callback, deps) {
	if (isServer) {
		return;
	} else if (!callback) {
		return queue.size ? new Promise(resolve => effects.push([, resolve])) : Promise.resolve();
	}

	processMemo(callback, deps, prevMemos, effects);
}

export default function renderImpulse (ref, object, children, context, document, nodes) {
	if (!ref[1]) {
		ref[1] = [, new Set(), ...impulses.slice(0, -1)];
	}

	// TODO: rename ref params throughout code base
	const { ref: refProp, ...props } = object;
	const [, impulse] = ref;
	const [parentNode] = nodes;
	const refIndex = refProp?.length;
	let nodeIndex = nodes.length;
	let prevNodes;

	const update = () => {
		const [callback,, prevProxy] = ref;
		prevMemos = ref.splice(3);
		refs.unshift(ref);
		impulses.unshift(impulse);
		const sibling = prevNodes?.[prevNodes?.length - 1]?.nextSibling;
		const layout = execute(callback, props, ...children) || '';
		const proxy = render(layout, context, document, nodes, ref, -1, {});
		impulses.shift();
		refs.shift();

		if (prevNodes) {
			reconcile(parentNode, nodes.slice(1), prevNodes, sibling);

			if (proxy !== prevProxy) {
				remove(prevProxy, parentNode);
			}
		}

		if (refProp) {
			refProp[refIndex] = nodes[nodeIndex];
		}

		prevNodes = nodes.slice(1);
		nodes = [parentNode];
		nodeIndex = 1;
	};

	impulse[0] = update;
	update();
}
