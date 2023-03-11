import { frameworks, impulses } from './execute';
import { virtualDocument } from '.';

export const record = new WeakMap();
export const queue = new Set();
let timeout;

function screen (impulse) {
	// check if impulse or parent is in view
	if (queue.has(impulse)) return true;
	const { parentImpulse } = impulse;
	return !!parentImpulse && screen(parentImpulse);
}

export function schedule (subscriptions) {
	// don't allow async updates or effects for virtual document
	if (frameworks[0]?.[0] === virtualDocument) return;

	// add subscriptions to queue unless they are already covered by parent
	for (const impulse of subscriptions.splice(0)) {
		const isQueued = screen(impulse);
		if (isQueued) continue;
		queue.add(impulse);
	}

	// schedule update after all main thread tasks have finished
	timeout = timeout !== undefined ? timeout : setTimeout(() => {
		for (const impulse of queue) {
			impulse();
		}

		queue.clear();
		timeout = undefined;
	}, 0);
}

// TODO: don't set up state if document doesn't allow setState
export default function observe (object) {
	const state = {};
	const changes = {};
	record.set(state, changes);
	// TODO: clear props from all objects in record once all active effect functions have finished
	// - these objects are passed as the second parameter to those functions
	// - might not be able to use WeakMap for this, so would need to make sure to remove entries from map on teardown of fragment state
	// - maybe change this to store old values, but what if values are changed back to old values before effect fires?
	// - second param of effect would need to be a copy of the state the last time the fragment rendered, but is that work the cost?

	// set up subscribe/dispatch pattern on properties
	for (let [name, value] of Object.entries(object)) {
		const subscriptions = [];

		// bind context
		if (typeof value === 'function') {
			value = value.bind(state);
		}

		// subscribe on get and dispatch on set
		Object.defineProperty(state, name, {
			get () {
				subscriptions.push(impulses[0]);
				return value;
			},
			set (newValue) {
				if (newValue === value) return;
				changes[name] = value = newValue;
				schedule(subscriptions);
			},
		});
	}

	return state;
}
