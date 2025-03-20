import { isServer } from '.';
import render from './view';
import { teardown, reconcile } from './element';

const root = [() => {}, new WeakSet()];
export const impulses = [root];
export const queue = new Set();
const scheduleQueue = requestAnimationFrame || setTimeout;

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

export function renderImpulse (ref, props, children, context, document, nodes, hooks) {
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

export function schedule (subscriptions) {
	if (!subscriptions.length) {
		return;
	} else if (!queue.size) {
		scheduleQueue(() => {
			for (const array of queue) {
				const [impulse, [unsubscribe, ...parents]] = array;
				unsubscribe();

				if (!parents.some(queue.has)) {
					impulse();
				}
			}

			queue.clear();
			processEffects();
		}, 0);
	}

	for (const callback of subscriptions) {
		queue.add(callback);
	}
}

export default function createState (state) {
	if (isServer) {
		return state;
	}

	for (const name in state) {
		const subscriptions = new Set();
		let value = state[name];

		// TODO: check that function maintain their binding after definePropery
		// if (typeof value === 'function') {
		// 	value = value.bind(state);
		// }

		Object.defineProperty(state, name, {
			get () {
				const [[impulse, set]] = impulses;
				subscriptions.add(impulse);
				set.add(subscriptions); // this is what allows impulses to unsub themselves
				return value;
			},
			set (newValue) {
				if (newValue !== value) {
					value = newValue;
					schedule(subscriptions);
					// subscriptions.clear(); // this shouldn't be needed as long as impulses unsubscribe themselves (having it here creates an issue for things that get after this has been set and queued)
				}
			},
		});
	}

	return state;
}
