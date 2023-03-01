import execute, { contexts, stack } from './execute';

export const queue = new Set();
let timeout;

function screen (callback) {
	const { parentCallback } = contexts.get(callback) || {};
	if (!parentCallback) return false; // root reached with an update found
	if (queue.has(parentCallback)) return true; // parent callback will update
	return screen(parentCallback); // check next parent callback
}

function schedule (subscriptions) {
	// add subscriptions to queue unless they are already covered by parent
	for (const callback of subscriptions.splice(0)) {
		const isQueued = queue.has(callback) || screen(callback);
		if (isQueued) continue;
		queue.add(callback);
	}

	// schedule update after all main thread tasks have finished
	timeout = timeout !== undefined ? timeout : setTimeout(() => {
		for (const callback of queue) {
			execute(callback);
		}

		queue.clear();
		timeout = undefined;
	}, 0);
}

// TODO: don't set up state if document doesn't allow setState
// - eventually build will make it so this lives in the scope of the root function instead of document needing to be passed all around
// - having each document resolution context in its own instance will help with future optimizations too
export default function observe (object) {
	const entries = !object ? [] : Object.entries(object);
	if (entries.length === 0) return;
	const state = {};

	// set up subscribe/dispatch pattern on properties
	for (let [name, value] of entries) {
		const subscriptions = [];

		// bind context
		if (typeof value === 'function') {
			// TODO: check if this is needed now that value is read from value
			// - probably is since values context is object instead of state
			value = value.bind(state);
		}

		// subscribe on get and dispatch on set
		Object.defineProperty(state, name, {
			get () {
				subscriptions.push(stack[0]);
				return value;
			},
			set (newValue) {
				value = newValue;
				schedule(subscriptions);
			}
		});
	}

	return state;
}
