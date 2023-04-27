import { executeCallback, fibers } from './fiber';

export const effects = [];
export const queue = new Set();
const resets = [];
let timeout;

export function scheduleDispatches (subscriptions) {
	for (const fiber of subscriptions) {
		queue.add(fiber);
	}

	// wait on previously requested animation frame
	if (timeout) return;

	// schedule update after all main thread tasks have finished
	timeout = setTimeout(() => {
		// resolve effects
		for (const effect of effects.splice(0)) {
			effect();
		}

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
		timeout = undefined;

		// call impulses by depth, skipping ones that were triggered by parent
		for (const i of Object.keys(queueLayers).sort((a, b) => a - b)) {
			for (const impulse of queueLayers[i]) {
				if (impulse.queued) impulse();
			}
		}

		// reset all active cues
		for (const [state, name] of resetsCopy) {
			state[name] = undefined;
		}
	}, 0);
}

// TODO: is this not firing in preview, or is ref not beign set
export function onRender (callback) {
	// ignore effects on the server
	if (fibers.isServer) return;
	const [fiber] = fibers;

	// process either state or effect
	return new Promise(resolve => {
		// add effect and schedule resolution
		effects.push(() => {
			const teardown = callback ? executeCallback(callback) : undefined;
			if (fiber) fiber.teardowns.push(teardown);
			resolve(teardown)
		});

		scheduleDispatches([]);
	});
}

export default function createState (object, cues = []) {
	// create empty state
	const state = Array.isArray(object) ? [] : {};

	if (cues.length) {
		// add defaults for cues
		const cuesObject = Object.fromEntries(cues.map(cue => [cue]))
		object = Object.assign(cuesObject, object);
	}

	// prepare entries
	const entries = Object.entries(object);

	if (fibers.isServer) {
		// skip subscriptions on server
		Object.assign(state, Object.fromEntries(entries.splice(0)));
	}

	for (let [name, value] of entries) {
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

	return state;
}
