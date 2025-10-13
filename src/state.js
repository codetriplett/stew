import { stack, processEffects } from './impulse';

export const queue = new Set();
export const animations = new Map();

const requestAnimationFrame = globalThis.requestAnimationFrame || setTimeout;
let animationActive = false;

function draw (timestamp) {
	if (queue.size) {
		for (const impulse of queue) {
			const [update,, ...parentImpulses] = impulse;

			if (!parentImpulses.some(parentImpulse => queue.has(parentImpulse))) {
				update();
			}
		}

		queue.clear();
		processEffects();
	}

	for (const [gl, array] of animations) {
		const [prevTimestamp, nextTimestamp, ...programs] = array;
		let param;

		if (nextTimestamp > timestamp) {
			continue;
		}

		const duration = prevTimestamp === undefined ? 0 : timestamp - prevTimestamp;
		array[0] = timestamp;

		for (const { program, callbacks } of programs) {
			if (program) {
				gl.useProgram(program);
			}

			for (const callback of callbacks) {
				param = callback(gl, duration, param) ?? param;
			}
		}

		if (param > 0) {
			array[1] += param;
		} else {
			animations.delete(gl);
		}
	}

	if (animations.size) {
		requestAnimationFrame(draw);
	} else {
		animationActive = false;
	}
}

export function schedule (subscriptions) {
	if (subscriptions) {
		const queueSize = queue.size;

		for (const impulse of subscriptions) {
			queue.add(impulse);
		}

		if (!subscriptions.size || queueSize) {
			return;
		}
	}

	if (!animationActive) {
		animationActive = true;
		requestAnimationFrame(draw);
	}
}

export default function createState (object) {
	if (typeof window !== 'object' && !stack[0]?.[5]) {
		return object;
	}

	const state = {};

	for (const name in object) {
		const subscriptions = new Set();
		let value = object[name];

		Object.defineProperty(state, name, {
			get () {
				if (stack.length) {
					const impulse = stack[0][1];
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
