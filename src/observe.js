import { frameworks, impulses } from './activate';
import { virtualDocument } from '.';

export const queue = new Set();
export const cues = new WeakMap();
const resets = [];
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
	for (const impulse of subscriptions) {
		queue.add(impulse);
	}

	subscriptions.clear();

	// schedule update after all main thread tasks have finished
	timeout = timeout !== undefined ? timeout : setTimeout(() => {
		// filter out any impulses that will already be covered by a parent update
		for (const impulse of queue) {
			const isCovered = screen(impulse);
			if (isCovered) continue;
			impulse();
		}

		// reset all active cues
		for (const [state, name] of resets.splice(0)) {
			state[name] = undefined;
		}

		// clear queue and timeout
		queue.clear();
		timeout = undefined;
	}, 0);
}

// TODO: don't set up state if document doesn't allow setState
export default function observe (object) {
	const state = {};
	const cueMap = {};

	for (let [name, value] of Object.entries(object)) {
		const subscriptions = new Set();

		// bind context
		if (typeof value === 'function') {
			// add cue's prop name to list
			if (cues.has(value)) {
				const propName = cues.get(value);
				cueMap[propName] = value;
				cues.set(value, undefined);
				Object.defineProperty(state, name, { value, writeable: false });
				continue;
			}

			// ensure context of function matches the state object
			value = value.bind(state);
		}

		// create subscribe/dispatch with getter/setter
		Object.defineProperty(state, name, {
			get () {
				// subscribe impulse to changes to this property
				if (impulses.length) {
					const [impulse] = impulses;
					subscriptions.add(impulse);
					impulse.subscriptionsSet.add(subscriptions);
				}

				return value;
			},
			set (newValue) {
				// update value if it has changed
				if (newValue === value) return;
				value = newValue;
				const cueSetter = cueMap[name];

				if (cueSetter) {
					cues.set(cueSetter, value);
					// do not dispatch a cue reset
					if (value === undefined) return;
					// mark cue as needing to be reset
					resets.push([state, name]);
				}

				// dispatch change to subscribed listeners
				schedule(subscriptions);
			},
		});
	}

	return state;
}
