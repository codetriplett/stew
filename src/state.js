import { fibers } from './impulse';
import { frameworks } from '.';

export const effects = [];
export const queue = new Set();
const resets = [];
let timeout;

export function scheduleCallbacks (subscriptions) {
	// add to queue
	if (typeof subscriptions === 'function') {
		effects.push(subscriptions);
	} else {
		for (const fiber of subscriptions) {
			queue.add(fiber);
		}
	}

	// schedule update after all main thread tasks have finished
	timeout = timeout !== undefined ? timeout : setTimeout(() => {
		// prepare copies
		const resetsCopy = resets.splice(0);
		const queueLayers = {};

		// organized impulses
		for (const fiber of [...queue]) {
			const { 0: impulse, d } = fiber;
			const queueLayer = queueLayers[d];
			if (queueLayer) queueLayer.push(impulse);
			else queueLayers[d] = [impulse];
			fiber[0].q = true;
		}
		
		// clear queues and timeout
		queue.clear();
		timeout = undefined;

		// resolve effects
		for (const effect of effects.splice(0)) {
			effect();
		}

		// filter out any impulses that will already be covered by a parent update
		for (const i of Object.keys(queueLayers).sort((a, b) => a - b)) {
			for (const impulse of queueLayers[i]) {
				if (impulse.q) impulse();
			}
		}

		// reset all active cues
		for (const [state, name] of resetsCopy) {
			state[name] = undefined;
		}
	}, 0);
}

export default function createState (object, key) {
	// prepare state and entries
	const state = Array.isArray(object) ? [] : {};
	const cues = key !== undefined && object[key] || [];
	const cuesObject = Object.fromEntries(cues.map(cue => [cue]));
	const entries = Object.entries({ ...cuesObject, ...object });

	if (frameworks[0]?.isServer) {
		// skip subscriptions on server
		Object.assign(state, Object.fromEntries(entries.splice(0)));
	}

	for (let [name, value] of entries) {
		if (name === key) continue;
		const isCue = ~cues.indexOf(name);
		const subscriptions = new Set();

		// bind context
		if (typeof value === 'function') {
			// ensure context of function matches the state object
			value = value.bind(state);
		}

		// create subscribe/dispatch with getter/setter
		Object.defineProperty(state, name, {
			get () {
				// subscribe impulse to changes to this property
				if (fibers.length) {
					const [fiber] = fibers;
					subscriptions.add(fiber);
					fiber.s.add(subscriptions);
				}

				return value;
			},
			set (newValue) {
				// update value if it has changed
				if (newValue === value) return;
				value = newValue;

				if (isCue) {
					// do not dispatch a cue reset
					if (value === undefined) return;
					// mark cue as needing to be reset
					resets.push([state, name]);
				}

				// dispatch change to subscribed listeners
				scheduleCallbacks(subscriptions);
				subscriptions.clear();
			},
		});
	}

	// return state as-is or add self reference first
	if (key === undefined) return state;
	return Object.defineProperty(state, key, { value: state, writeable: false });
}
