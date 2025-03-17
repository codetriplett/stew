import { isServer } from './dom';
import { tree, impulses, followups } from './impulse';

export const queue = new Set();
let unlocked = new Set();
let unlock = new Set();

export function schedule (subscriptions) {
	const isQueueActive = !!queue.size;

	for (const callback of subscriptions) {
		queue.add(callback);
	}

	// wait on previously requested animation frame
	if (isQueueActive) {
		return;
	}

	// schedule update after all main thread tasks have finished
	setTimeout(() => {
		// call impulses not contained within another queued impulse
		for (const impulse of queue) {
			if (tree.get(impulse)?.some?.(queue.has)) {
				continue;
			}

			impulse();
		}

		// process followups that were defined outside of any impulse
		for (const followup of followups.shift()) {
			followup();
		}

		queue.clear();
		unlocked = unlock;
		unlock = new Set();
	}, 0);
}

export default function createState (object, cues = []) {
	// skip subscriptions on server
	if (isServer) {
		Object.assign(state, Object.fromEntries(entries.splice(0)));
	}

	// create empty state
	const state = Array.isArray(object) ? [] : {};
	const names = new Set([...Object.keys(object), ...cues]);

	for (const name of names) {
		// initialize
		const isCue = ~cues.indexOf(name);
		const subscriptions = new Set();
		let value = object[name];

		// bind context
		if (typeof value === 'function') {
			// ensure context of function matches the state object
			value = value.bind(state);
		}

		// create subscribe/dispatch with getter/setter
		Object.defineProperty(state, name, {
			get () {
				const [[impulse, set]] = impulses;

				// subscribe impulse to changes and include teardown to unsubscribe
				if (!subscriptions.has(impulse)) {
					subscriptions.add(impulse);
					set.add(subscriptions);
				}

				// return value if allowed
				if (!isCue || unlocked.has(subscriptions)) {
					return value;
				}
			},
			set (newValue) {
				// update value if it has changed
				if (isCue) {
					unlock.add(subscriptions);
				} else if (newValue === value) {
					return;
				}

				// dispatch change to subscribed listeners
				value = newValue;
				schedule(subscriptions);
				subscriptions.clear();
			},
		});
	}

	return state;
}
