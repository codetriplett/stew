import { execute } from '.';
import { isServer } from './document';
import render, { remove, reconcile } from './view';
import { queue } from './state';

export const impulses = [];
const effects = [];
const memos = [];
let prevEffects;

export function processEffects () {
	for (const effect of effects.splice(0)) {
		const [teardown, callback] = effect;

		if (callback) {
			const param = teardown && execute(teardown);
			effect.splice(0, 2, execute(callback, param), undefined);
		}
	}
}

// change this to 'useMemo' and have callback update the stored value that useMemo returns if the deps have changed
// - use same deps logic as onRender, and try to have both use common resolver (only difference is onRender store it in effects for later use and useMemo stores it in memos array ref[1])
// - this will allow simulations of useState, by returning something from createState, and useCallback, by just returning a callback
// - should it maybe just store these in effects, but with no followup function to have later processing skip them?
// - if ref[1] no longer needs to store memo, can that maybe store the impulse, and elements store their node on '' prop of their map?
export function onUpdate (callback, deps) {
	const [memo, nextMemo] = memos[0];

	if (callback && (!deps || Object.entries(deps).some(([name, value]) => value !== memo[name]))) {
		const props = callback(memo);
		Object.assign(memo, props || {});
	}

	Object.assign(nextMemo, deps || {});
	return memo;
}

export function onRender (callback, deps) {
	if (isServer) {
		return;
	} else if (!callback) {
		return queue.size ? new Promise(resolve => effects.push([, resolve])) : Promise.resolve();
	}

	let effect = prevEffects.shift();
	
	if (!effect || !deps || deps.some((value, i) => value !== effect[i + 2])) {
		const teardown = effect?.[0];
		effect = [teardown, callback, ...(deps || [])];
	}

	effects.push(effect);
}

export default function renderImpulse (ref, props, children, context, document, nodes) {
	if (!ref[1]) {
		ref.splice(1, 2, {}, [, new Set(),, ...impulses.slice(0, -1)]);
	}
	
	const [, memo, impulse] = ref;
	const [parentNode] = nodes;
	let prevProxy, prevNodes;

	const update = () => {
		prevEffects = ref.splice(3);
		impulses.unshift(impulse);
		memos.unshift([memo, {}]);
		const effectCount = effects.length;
		const [callback] = ref;
		const layout = execute(callback, props, ...children) || '';
		const proxy = render(layout, context, document, nodes, impulse, -1, {});
		Object.assign(memo, memos.shift()[1]);
		impulses.shift();

		if (prevNodes) {
			const sibling = prevNodes[prevNodes.length - 1].nextSibling;
			reconcile(parentNode, nodes.slice(1), prevNodes, sibling);

			if (proxy !== prevProxy) {
				remove(prevProxy, parentNode);
			}
		}
		
		ref.push(...effects.slice(effectCount));
		prevProxy = proxy;
		prevNodes = nodes.slice(1);
		nodes = [parentNode];
	};

	impulse[0] = update;
	update();
}
