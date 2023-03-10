import execute, { impulses } from './execute';

export const queue = new Set();
let timeout;

function screen (impulse) {
	// check if impulse or parent is in view
	if (queue.has(impulse)) return true;
	const { parentImpulse } = impulse;
	return !!parentImpulse && screen(parentImpulse);
}

function schedule (subscriptions) {
	// add subscriptions to queue unless they are already covered by parent
	for (const impulse of subscriptions.splice(0)) {
		const isQueued = screen(impulse);
		if (isQueued) continue;
		queue.add(impulse);
	}

	// schedule update after all main thread tasks have finished
	timeout = timeout !== undefined ? timeout : setTimeout(() => {
		for (const impulse of queue) {
			execute(impulse);
		}

		queue.clear();
		timeout = undefined;
	}, 0);
}

// TODO: don't set up state if document doesn't allow setState
// - eventually build will make it so this lives in the scope of the root function instead of document needing to be passed all around
// - having each document resolution context in its own instance will help with future optimizations too
export default function observe (object) {
	const state = {};

	// set up subscribe/dispatch pattern on properties
	for (let [name, value] of Object.entries(object)) {
		const subscriptions = [];

		// bind context
		if (typeof value === 'function') {
			// TODO: check if this is needed now that value is read from destructured entry
			// - probably is since values context is object instead of state
			value = value.bind(state);
		}

		// subscribe on get and dispatch on set
		Object.defineProperty(state, name, {
			get () {
				subscriptions.push(impulses[0]);
				return value;
			},
			set (newValue) {
				value = newValue;
				schedule(subscriptions);
			},
		});
	}

	return state;
}
