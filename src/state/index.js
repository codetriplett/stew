import { fibers } from './fiber';
import { frameworks } from '../view/dom';

export const effects = [];
export const queue = new Set();
const resets = [];
let animationFrame;

export function scheduleDispatches (subscriptions) {
	for (const fiber of subscriptions) {
		queue.add(fiber);
	}

	// wait on previously requested animation frame
	if (animationFrame) return;

	// schedule update after all main thread tasks have finished
	requestAnimationFrame(() => {
		// prepare copies
		const resetsCopy = resets.splice(0);
		const queueLayers = {};

		// organized impulses
		for (const fiber of [...queue]) {
			const { 0: impulse, depth } = fiber;
			const queueLayer = queueLayers[depth];
			if (queueLayer) queueLayer.push(impulse);
			else queueLayers[depth] = [impulse];
			fiber[0].queued = true;
		}

		// clear queues and timeout
		queue.clear();
		animationFrame = undefined;

		// resolve effects
		for (const effect of effects.splice(0)) {
			effect();
		}

		// filter out any impulses that will already be covered by a parent update
		for (const i of Object.keys(queueLayers).sort((a, b) => a - b)) {
			for (const impulse of queueLayers[i]) {
				if (impulse.queued) impulse();
			}
		}

		// reset all active cues
		for (const [state, name] of resetsCopy) {
			state[name] = undefined;
		}
	});
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
					fiber.registry.add(subscriptions);
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
				scheduleDispatches(subscriptions);
				subscriptions.clear();
			},
		});
	}

	// return state as-is or add self reference first
	if (key === undefined) return state;
	return Object.defineProperty(state, key, { value: state, writeable: false });
}
