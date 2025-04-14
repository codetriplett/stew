import { isServer } from './document';
import { impulses, processEffects } from './impulse';

export const queue = new Set();

export function unsubscribe (impulse) {
	const subscriptions = impulse[1];

	for (const subscription of subscriptions) {
		subscription.delete(impulse);
	}

	subscriptions.clear();
}

export function schedule (subscriptions) {
	if (!subscriptions.size) {
		return;
	} else if (!queue.size) {
		requestAnimationFrame(() => {
			for (const impulse of queue) {
				const [update,, ...parentImpulses] = impulse;
				unsubscribe(impulse);

				if (!parentImpulses.some(parentImpulse => queue.has(parentImpulse))) {
					update();
				}
			}

			queue.clear();
			processEffects();
		});
	}

	for (const impulse of subscriptions) {
		queue.add(impulse);
	}
}

export default function createState (state) {
	if (isServer) {
		return state;
	}

	for (const name in state) {
		const subscriptions = new Set();
		let value = state[name];

		Object.defineProperty(state, name, {
			get () {
				if (impulses.length) {
					const [impulse] = impulses;
					subscriptions.add(impulse);
					impulse[1].add(subscriptions); // this is what allows impulses to unsub themselves
				}
				
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
