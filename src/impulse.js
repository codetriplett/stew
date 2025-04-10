import { execute } from '.';
import { isServer } from './document';
import render, { remove, reconcile } from './view';
import { queue } from './state';

export const impulses = [];
const effects = [];
const memos = [];
let prevMemos, prevEffects;

export function processEffects () {
	for (const effect of effects.splice(0)) {
		const [teardown, callback] = effect;

		if (callback) {
			const param = teardown && execute(teardown);
			effect.splice(0, 2, execute(callback, param), undefined);
		}
	}
}

function processHook (callback, deps, prevValues) {
	let value = prevValues.shift();
	
	if (!value || !deps || deps.some((value, i) => value !== value[i + 2])) {
		const teardown = value?.[0];
		value = [teardown, callback, ...(deps || [])];
	}

	return value;
}

// change this to 'useMemo' and have callback update the stored value that useMemo returns if the deps have changed
// - use same deps logic as onRender, and try to have both use common resolver (only difference is onRender store it in effects for later use and useMemo stores it in memos array ref[1])
// - this will allow simulations of useState, by returning something from createState, and useCallback, by just returning a callback
// - should it maybe just store these in effects, but with no followup function to have later processing skip them?
// - if ref[1] no longer needs to store memo, can that maybe store the impulse, and elements store their node on '' prop of their map?
export function useMemo (callback, deps) {
	if (!callback) {
		callback = () => ({});
	}

	let memo = processHook(callback, deps, prevMemos);
	let [value] = memo;

	if (memo[1]) {
		value = callback(value);
		memo.splice(0, 2, value, undefined);
	}

	memos.push(memo);
	return value;
}

export function onRender (callback, deps) {
	if (isServer) {
		return;
	} else if (!callback) {
		return queue.size ? new Promise(resolve => effects.push([, resolve])) : Promise.resolve();
	}

	const effect = processHook(callback, deps, prevEffects);
	effects.push(effect);
}

export default function renderImpulse (ref, props, children, context, document, nodes) {
	if (!ref[1]) {
		ref.splice(1, 2, [], [, new Set(),, ...impulses.slice(0, -1)]);
	}
	
	const [,, impulse] = ref;
	const [parentNode] = nodes;
	let prevProxy, prevNodes;

	const update = () => {
		prevMemos = ref[1];
		prevEffects = ref.splice(3);
		impulses.unshift(impulse);
		const effectCount = effects.length;
		const [callback] = ref;
		const layout = execute(callback, props, ...children) || '';
		const proxy = render(layout, context, document, nodes, impulse, -1, {});
		impulses.shift();

		if (prevNodes) {
			const sibling = prevNodes[prevNodes.length - 1].nextSibling;
			reconcile(parentNode, nodes.slice(1), prevNodes, sibling);

			if (proxy !== prevProxy) {
				remove(prevProxy, parentNode);
			}
		}
		
		ref[1] = memos.splice(0);
		ref.push(...effects.slice(effectCount));
		prevProxy = proxy;
		prevNodes = nodes.slice(1);
		nodes = [parentNode];
	};

	impulse[0] = update;
	update();
}
