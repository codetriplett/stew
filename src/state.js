import { isServer } from './document';
import { impulses, processEffects } from './impulse';

const queue = new Set();
const scheduleQueue = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : setTimeout;

function schedule (subscriptions) {
	if (!subscriptions.size) {
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

export function createState (state) {
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
				const [array] = impulses;
				subscriptions.add(array);
				array[2].add(subscriptions); // this is what allows impulses to unsub themselves
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
