import { execute } from '.';
import { isServer } from './document';
import render, { remove, reconcile } from './view';
import { queue } from './state';

// TODO: just store refs on impulses and have state read the [2] item from that instead
export const impulses = [];
const refs = [[null, [], null]];
let prevMemos, prevEffects;

export function processEffects () {
	for (const effect of refs[0].splice(3)) {
		const [teardown, callback] = effect;

		if (callback) {
			const param = teardown && execute(teardown);
			effect.splice(0, 2, execute(callback, param), undefined);
		}
	}
}

function processMemo (callback, deps, prevMemos) {
	let memo = prevMemos.shift();

	if (!memo || !deps || deps.some((value, i) => value !== memo[i + 2])) {
		const teardown = memo?.[0];
		memo = [teardown, callback, ...(deps || [])];
	}

	return memo;
}

// change this to 'useMemo' and have callback update the stored value that useMemo returns if the deps have changed
// - use same deps logic as onRender, and try to have both use common resolver (only difference is onRender store it in effects for later use and useMemo stores it in memos array ref[1])
// - this will allow simulations of useState, by returning something from createState, and useCallback, by just returning a callback
// - should it maybe just store these in effects, but with no followup function to have later processing skip them?
// - if ref[1] no longer needs to store memo, can that maybe store the impulse, and elements store their node on '' prop of their map?
export function useMemo (callback, deps) {
	if (refs.length < 2) {
		return;
	} else if (!callback) {
		callback = () => ({});
	}

	let memo = processMemo(callback, deps, prevMemos);
	let [value] = memo;

	if (memo[1]) {
		value = callback(value);
		memo.splice(0, 2, value, undefined);
	}

	refs[0][1].push(memo);
	return value;
}

export function onRender (callback, deps) {
	if (isServer) {
		return;
	} else if (!callback) {
		return queue.size ? new Promise(resolve => effects[0].push([, resolve])) : Promise.resolve();
	}

	const effect = processMemo(callback, deps, prevEffects);
	refs[0].push(effect);
}

export default function renderImpulse (ref, props, children, context, document, nodes) {
	if (!ref[1]) {
		ref.splice(1, 2, [], [, new Set(),, ...impulses.slice(0, -1)]);
	}
	
	const [,, impulse] = ref;
	const [parentNode] = nodes;
	let prevProxy, prevNodes;

	const update = () => {
		prevMemos = ref[1].splice(0);
		prevEffects = ref.splice(3);
		refs.unshift(ref);
		impulses.unshift(impulse);
		const [callback] = ref;
		const layout = execute(callback, props, ...children) || '';
		const proxy = render(layout, context, document, nodes, impulse, -1, {});
		impulses.shift();
		refs.shift();
		refs[refs.length - 1].push(...ref.slice(3));

		if (prevNodes) {
			const sibling = prevNodes[prevNodes.length - 1].nextSibling;
			reconcile(parentNode, nodes.slice(1), prevNodes, sibling);

			if (proxy !== prevProxy) {
				remove(prevProxy, parentNode);
			}
		}

		prevProxy = proxy;
		prevNodes = nodes.slice(1);
		nodes = [parentNode];
	};

	impulse[0] = update;
	update();
}
