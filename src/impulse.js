import { isServer } from './dom';
import { queue } from './state';
import render, { execute } from './render';
import { teardown, reconcile } from './element';

const root = [() => {}, new WeakSet()];
export const impulses = [root];
let history;

export function execute (callback, ...params) {
	try {
		return callback?.(...params);
	} catch (err) {
		console.error(err);
	}
}

export function processEffects () {
	for (const effect of root.splice(2)) {
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
	const previous = history.shift();
	
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

export default function renderImpulse (ref, props, children, context, document, nodes, hooks) {
	let subscriptions, prevNodes, nextNodes, nextHooks;

	if (!ref[1]) {
		const unsubscribe = () => {
			for (const subscription of subscriptions) {
				subscription.delete(impulse);
			}
		};

		ref.splice(1, ref.length, {}, undefined, [unsubscribe, impulses.slice(0)]);
	}

	const impulse = () => {
		const [callback, memo, proxy] = ref;
		impulses.unshift([impulse, new Set(), ...ref.slice(2)]);
		const layout = execute(callback, { ...props, '': memo }, ...children) || '';
		nextNodes = nodes.slice(0, 1);
		ref[2] = render(layout, context, document, nextNodes, ref, -1, {});
		const parentNode = nextNodes.shift();
		[, subscriptions, ...nextHooks] = impulses.shift();

		if (prevNodes) {
			reconcile(parentNode, nextNodes, prevNodes, nextHooks);

			if (ref[2] !== proxy) {
				teardown(proxy);
			}
		}

		ref.splice(4, ref.length, ...nextHooks);
		prevNodes = nextNodes;
	};

	impulse();
	nodes.push(...nextNodes);
	hooks.push(...nextHooks);
}
