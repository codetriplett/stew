import render, { execute } from './lite';
import { teardown, reconcile } from './element';

export const tree = new WeakMap();
export const impulses = [[]];
export const followups = [[]];

// TODO: export onRender from here if it makes more sense

export function onRender (callback) {
	if (impulses.length < 2) {
		const promiseArray = [...promises];
		promises.clear();

		if (queue.size) {
			promiseArray.push(new Promise(resolve => queue.add(resolve)));
		}

		// server can call this to await all active promises before returning result
		// - hydration is set up to wait for promise to resolve client side as well
		return Promise.all(promiseArray).then(() => {
			// no need to wait at top level when nothing is queued
			const value = execute(callback);
			return Promise.resolve(value);
		});
	} else if (isServer) {
		return;
	}

	// return a promise and add as followup
	return new Promise(resolve => {
		followups[0].push(() => {
			const value = execute(callback);
			resolve(value);
		});
	});
}

export default function renderImpulse (ref, props, children, context, document, nodes) {
	let subscriptions, followups, prevNodes, nextNodes;

	if (!ref[1]) {
		const unsubscribe = () => {
			for (const subscription of subscriptions) {
				subscription.delete(impulse);
			}
		};

		ref.splice(1, ref.length, {}, undefined, unsubscribe);
	}

	const impulse = () => {
		const [callback, memo, proxy, unsubscribe] = ref;
		impulses.unshift([impulse, new Set()]);
		const layout = execute(callback, { ...props, '': memo }, ...children) || '';
		nextNodes = nodes.slice(0, 1);
		ref[2] = render(layout, context, document, nextNodes, ref, -1, {});
		const parentNode = nextNodes.shift();

		if (prevNodes) {
			unsubscribe();
			reconcile(parentNode, nextNodes, prevNodes);

			if (ref[2] !== proxy) {
				teardown(proxy);
			}
		}

		[, subscriptions, ...followups] = impulses.shift();
		const teardowns = followups.map(execute);
		ref.splice(4, ref.length, ...teardowns);
		prevNodes = nextNodes;
	};

	impulse();
	nodes.push(...nextNodes);
	tree.set(impulse, impulses.slice(0));
}
