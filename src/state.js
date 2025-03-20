import { isServer } from './dom';
import { impulses, processEffects } from './impulse';

export const queue = new Set();
const scheduleQueue = requestAnimationFrame || setTimeout;

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
