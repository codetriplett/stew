import reconcile, { managedProps, remove } from './reconcile';
import { frameworks, virtualDocument } from '.';

export const impulses = [];
export const queue = new Set();
const resets = [];
let timeout;

function screen (impulse) {
	// check if impulse will be covered by queued parent
	const { parentImpulse } = impulse;
	if (!parentImpulse) return false;
	if (queue.has(parentImpulse)) return true;
	return screen(parentImpulse);
}

function schedule (...subscriptions) {
	// ignore async action for virtual document
	if (frameworks[0]?.[0] === virtualDocument) return;

	// add to queue
	for (const impulse of subscriptions) {
		queue.add(impulse);
	}

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

function unsubscribe (impulses) {
	for (const impulse of impulses) {
		const { subscriptionsSet, childImpulses, memoArray, teardowns } = impulse;

		// remove impulse from subscriptions
		for (const subscriptions of subscriptionsSet) {
			subscriptions.delete(impulse);
		}

		// call teardown
		for (const index of teardowns) {
			const [teardown, ...prevDeps] = memoArray[index];
			if (typeof teardown === 'function') teardown(prevDeps);
		}

		// reset set and continue unsubscribing children
		subscriptionsSet.clear();
		unsubscribe(childImpulses);
	}
}

export function useMemo (callback, deps, key, cueCount) {
	const [impulse] = impulses;
	const { memoArray, memoIndex } = impulse;
	let memo = key !== undefined ? memoArray[0][key] : memoArray[memoIndex];
	let prevDeps, persist;

	if (memo) {
		prevDeps = memo.splice(1);

		persist = deps.length === prevDeps?.length && deps.every((it, i) => {
			return it === prevDeps[i] || i < cueCount && it === undefined;
		});
	} else {
		memo = [];
	}

	if (!persist) memo[0] = callback(memo[0], prevDeps);
	memo.push(...deps);
	if (key !== undefined) memoArray[0][key] = memo;
	else memoArray[impulse.memoIndex++] = memo
	return memo[0];
}

export function useEffect (callback, deps, key, cueCount) {
	const [impulse] = impulses;
	const { teardowns, memoIndex } = impulse;

	schedule(() => {
		useMemo(callback, deps, key, cueCount);
		teardowns.push(memoIndex);
	});
}

export function createState (object, key, cues = []) {
	// prepare props
	const cuesObject = Object.fromEntries(cues.map(cue => [cue]));
	const entries = Object.entries({ ...cuesObject, ...object });
	const state = {};
	if (key !== undefined) entries.push([key, state]);

	// don't set up subscribers for virtual document
	if (frameworks[0]?.[0] === virtualDocument) {
		return Object.assign(state, Object.fromEntries(entries));
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

				if (isCue) {
					// do not dispatch a cue reset
					if (value === undefined) return;
					// mark cue as needing to be reset
					resets.push([state, name]);
				}

				// dispatch change to subscribed listeners
				schedule(...subscriptions);
				subscriptions.clear();
			},
		});
	}

	return state;
}

export default function createImpulse (callback, state, parentView, i, dom, hydrateNodes) {
	// persist parent framework and dom reference object
	const [framework] = frameworks;
	const [parentImpulse] = impulses;
	const childImpulses = [];
	const memoArray = [{}];
	let initialized = false;

	// wrap in setup and teardown steps and store as new callback to subscribe to state property changes
	function impulse (newState) {
		// resurface stored framework
		frameworks.unshift(framework);
		impulses.unshift(impulse);
		unsubscribe(childImpulses.splice(0));
		impulse.memoIndex = 1;
		if (newState) state = newState;
		let outline;

		// safely run callback function
		try {
			outline = callback(state);
		} catch (e) {
			console.error(e);
		}

		if (i !== undefined) {
			// process return value as it normally would before resetting active framework
			const domCopy = { ...dom };
			const oldView = parentView[i + 2];
			reconcile(outline, state, parentView, i, dom, hydrateNodes);
			const newView = parentView[i + 2];
			dom = domCopy;

			if (initialized && oldView?.length && newView !== oldView) {
				// remove old nodes and subscriptions
				const { container } = dom;
				remove(oldView, container);
			}
		} else if (parentView[0]) {
			// process attribute update
			const [node] = parentView;
			const prevNames = managedProps.get(node);
			const [, updater, defaultProps] = framework;
			updater(node, outline, prevNames, defaultProps[node.tagName.toLowerCase()]);
			managedProps.set(node, Object.keys(outline));
		} else {
			// TODO: store childImpulses on fragment view
			// - calling them here with new state will update their internal state and update them
			// process state update
			for (const impulse of parentView.childImpulses) {
				impulse(outline);
			}
		}

		// reset stack
		impulses.shift();
		frameworks.shift();
		return outline;
	}

	// attach context to impulse
	Object.assign(impulse, {
		parentImpulse,
		childImpulses,
		memoArray,
		teardowns: [],
		subscriptionsSet: new Set()
	});

	// set parent impulse and call for first time, except for effects
	parentImpulse?.childImpulses?.push?.(impulse);
	const value = impulse();
	hydrateNodes = undefined;
	initialized = true;
	return value;
}
