import { frameworks, impulses } from './execute';
import { virtualDocument } from '.';

export const queue = new Set();
let timeout;

function screen (impulse) {
	// check if impulse will be covered by queued parent
	const { parentImpulse } = impulse;
	if (!parentImpulse) return false;
	if (queue.has(parentImpulse)) return true;
	return screen(parentImpulse);
}

export function schedule (subscriptions) {
	// ignore async action for virtual document
	if (frameworks[0]?.[0] === virtualDocument) return;

	// add to queue
	for (const impulse of subscriptions.splice(0)) {
		queue.add(impulse);
	}

	// schedule update after all main thread tasks have finished
	timeout = timeout !== undefined ? timeout : setTimeout(() => {
		for (const impulse of queue) {
			const isCovered = screen(impulse);
			if (isCovered) continue;
			impulse();
		}

		queue.clear();
		timeout = undefined;
	}, 0);
}

// TODO: don't set up state if document doesn't allow setState
export default function observe (object) {
	const state = {};

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
				value = newValue;
				schedule(subscriptions);
			},
		});
	}

	return state;
}
