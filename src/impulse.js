import { execute } from '.';
import { isServer } from './document';
import render, { remove, reconcile } from './view';
import { queue } from './state';

const root = [() => {}, new WeakSet()];
export const impulses = [root];
const effects = [];
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

export function onRender (callback, deps) {
	if (isServer) {
		return;
	} else if (!callback) {
		return queue.size ? new Promise(resolve => effects.push([, resolve])) : Promise.resolve();
	}

	let effect = prevEffects.shift();
	
	if (!effect || deps?.some?.((value, i) => value !== effect[i + 2])) {
		const teardown = effect?.[0];
		effect = [teardown, callback, ...deps];
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
		impulses.unshift(impulse);
		prevEffects = ref.splice(3);
		const effectCount = effects.length;
		const [callback] = ref;
		const nextNodes = [];
		const layout = execute(callback, { ...props, '': memo }, ...children) || '';
		const proxy = render(layout, context, document, nextNodes, impulse, -1, {});

		if (prevNodes) {
			reconcile(parentNode, nextNodes, prevNodes);

			if (proxy !== prevProxy) {
				remove(prevProxy, parentNode);
			}
		}
		
		impulses.shift();
		ref.push(...effects.slice(effectCount));
		prevProxy = proxy;
		prevNodes = nextNodes;
		return nextNodes;
	};

	impulse[0] = update;
	nodes.push(...update());
}
