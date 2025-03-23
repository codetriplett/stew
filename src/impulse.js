import { execute } from '.';
import { isServer } from './document';
import render, { remove, reconcile } from './view';

const root = [() => {}, [], new WeakSet(), []];
export const impulses = [root];

export function processEffects () {
	for (const effect of root.splice(3)) {
		const [callback, param] = effect.splice(0, 2);
		const teardown = callback ? execute(callback, param) : param;
		effect.unshift(undefined, teardown);
	}
}

export function onRender (callback, deps) {
	if (isServer) {
		return;
	} else if (!callback) {
		return queue.size ? new Promise(resolve => root.push([resolve])) : Promise.resolve();
	}
	
	const [array] = impulses;
	const previous = array[3].shift();
	
	if (previous && deps?.some?.((value, i) => value !== previous[i + 2])) {
		array.push(previous);
		return;
	}
	
	const [teardown] = previous;
	const param = execute(teardown);
	const effect = [callback, param, ...deps];
	root.push(effect);
	array.push(effect);
}

export default function renderImpulse (ref, props, children, context, document, nodes) {
	const [parentNode] = nodes;
	let subscriptions, prevNodes, nextNodes, effects;

	if (!ref[1]) {
		const unsubscribe = () => {
			for (const subscription of subscriptions) {
				subscription.delete(impulse);
			}
		};

		ref.splice(1, ref.length, {}, undefined, [unsubscribe, ...impulses.slice(0)]);
	}

	const impulse = () => {
		const [callback, memo, proxy] = ref;
		impulses.unshift([impulse, ref[3], new Set(), ref.splice(4)]);
		const layout = execute(callback, { ...props, '': memo }, ...children) || '';
		nextNodes = [];
		ref[2] = render(layout, context, document, nextNodes, ref, -1, {});
		[,, subscriptions,, ...effects] = impulses.shift();

		if (prevNodes) {
			reconcile(parentNode, nextNodes, prevNodes);

			if (ref[2] !== proxy) {
				remove(proxy, parentNode);
			}
		}

		ref.push(...effects);
		prevNodes = nextNodes;
	};

	impulse();
	nodes.push(...nextNodes);
}
