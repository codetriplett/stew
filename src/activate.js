import reconcile, { update, remove } from './reconcile';
import { frameworks, virtualDocument } from '.';

export const impulses = [];
export const effects = new Set();
export const queue = new Set();
const resets = [];
let timeout;

function screen (impulse, queueCopy) {
	// check if impulse will be covered by queued parent
	const { parentImpulse } = impulse;
	if (!parentImpulse) return false;
	if (queueCopy.has(parentImpulse)) return true;
	return screen(parentImpulse, queueCopy);
}

function schedule (subscriptions) {
	// ignore async action for virtual document
	if (frameworks[0]?.[0] === virtualDocument) return;

	// add to queue
	if (typeof subscriptions === 'function') {
		effects.add(subscriptions);
	} else {
		for (const impulse of subscriptions) {
			queue.add(impulse);
		}
	}

	// schedule update after all main thread tasks have finished
	timeout = timeout !== undefined ? timeout : setTimeout(() => {
		// clear queues and timeout
		const resetsCopy = resets.splice(0);
		const effectsCopy = [...effects];
		const queueCopy = new Set(queue);
		effects.clear();
		queue.clear();
		timeout = undefined;

		// resolve effects
		for (const effect of effectsCopy) {
			effect();
		}

		// filter out any impulses that will already be covered by a parent update
		for (const impulse of queueCopy) {
			const isCovered = screen(impulse, queueCopy);
			if (isCovered) continue;
			impulse();
		}

		// reset all active cues
		for (const [state, name] of resetsCopy) {
			state[name] = undefined;
		}
	}, 0);
}

function unsubscribe (impulses) {
	// clear flag when unsubscribing hook-based impulse
	if (!Array.isArray(impulses)) {
		impulses.persist = false;
		impulses = [impulses];
	}

	for (const impulse of impulses) {
		if (impulse.persist) continue;
		const { subscriptionsSet, childImpulses, view } = impulse;
		const { memos, teardowns } = view;

		// remove impulse from subscriptions
		for (const subscriptions of subscriptionsSet) {
			subscriptions.delete(impulse);
		}

		// call teardown
		for (const index of teardowns) {
			const [teardown, ...prevDeps] = memos[index];
			if (typeof teardown === 'function') teardown(prevDeps);
		}
		
		// clear memo props
		Object.assign(view, {
			impulse: undefined,
			memos: undefined,
			teardowns: undefined,
			index: undefined,
		});

		// reset set and continue unsubscribing children
		subscriptionsSet.clear();
		unsubscribe(childImpulses);
	}
}

export function useMemo (callback, deps, cueCount) {
	const [{ view } = {}] = impulses;
	const { memos, index } = view || {};
	let memo = view ? memos[index] : undefined;
	let prevDeps, persist;

	if (memo) {
		prevDeps = memo.splice(1);

		persist = deps && deps.length === prevDeps?.length && deps.every((it, i) => {
			return it === prevDeps[i] || i < cueCount && it === undefined;
		});
	} else {
		memo = [];
	}

	if (!persist) {
		try {
			memo[0] = callback(memo[0], prevDeps);
		} catch (e) {
			console.error(e);
		}
	}

	if (deps) memo.push(...deps);
	if (view) memos[view.index++] = memo;
	return memo[0];
}

export function useEffect (...params) {
	const [impulse] = impulses;
	const { memos, index, teardowns } = impulse.view;

	// make async
	schedule(() => {
		impulses.unshift(impulse);
		useMemo(...params);
		impulses.shift();
		teardowns.push(index);
	});

	// return previous value
	return memos[index];
}

export function useImpulse (callback, ...rest) {
	return useMemo(([prevValue, view] = [], prevDeps = []) => {
		// activate also returns view in this case so it can be reused to attach memos to
		return activate(callback, prevValue, [view, ...prevDeps], -1);
	}, ...rest)[0];
}

export function useState (object, ...rest) {
	// extract key
	const key = /^string|number$/.test(typeof rest[0]) ? rest.shift() : undefined;

	return useMemo((...params) => {
		// prepare object and state
		if (typeof object === 'function') object = object(...params);
		const state = Array.isArray(object) ? [] : {};

		// prepare cues and create entries
		const cues = key !== undefined && object[key] || [];
		const cuesObject = Object.fromEntries(cues.map(cue => [cue]));
		const entries = Object.entries({ ...cuesObject, ...object });

		// don't set up subscribers for virtual document
		if (frameworks[0]?.[0] === virtualDocument) {
			Object.assign(state, Object.fromEntries(entries));
			entries.splice(0);
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
					schedule(subscriptions);
					subscriptions.clear();
				},
			});
		}

		// return state as-is or add self reference first
		if (key === undefined) return state;
		return Object.defineProperty(state, key, { value: state, writeable: false });
	}, ...rest);
}

export default function activate (callback, state, parentView, i, dom = {}, hydrateNodes) {
	// persist parent framework and dom reference object
	const [framework] = frameworks;
	const [parentImpulse] = impulses;
	const childImpulses = [];
	const view = i === undefined ? parentView : parentView[i + 1] || [];
	const sibling = { ...dom };
	let params = [];
	let initialized = false;

	// wrap in setup and teardown steps and store as new callback to subscribe to state property changes
	function impulse (newState) {
		// resurface stored framework
		frameworks.unshift(framework);
		impulses.unshift(impulse);
		unsubscribe(childImpulses.splice(0));
		Object.assign(view, { index: 0, teardowns: [] });
		if (newState) state = newState;
		let outline;

		// safely run callback function
		try {
			outline = callback(state, ...params);
		} catch (e) {
			console.error(e);
		}

		if (i < 0) {
			// process detached impulse
			outline = [outline, view];
		} else if (i !== undefined) {
			// process return value as it normally would before resetting active framework
			if (initialized) dom = { ...sibling };
			reconcile(outline, state, parentView, i, dom, hydrateNodes);
			let newView = parentView[i + 1];

			if (newView !== view) {
				// remove old nodes and subscriptions
				if (view.length) remove(view, dom.container);
				view.splice(0, view.length, ...newView);
				view.keyedViews = newView.keyedViews;
				parentView[i + 1] = view;
			}
		} else if (parentView[0]) {
			// process attribute update
			const [, updater, defaultProps] = framework;
			update(parentView[0], outline, updater, defaultProps, initialized);
		} else if (initialized) {
			// process state update
			for (const impulse of view.impulse.childImpulses) {
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
		view,
		subscriptionsSet: new Set()
	});

	// set parent impulse and memos
	parentImpulse?.childImpulses?.push?.(impulse);
	if (!view.memos) Object.assign(view, { memos: [] });
	if (view.impulse) unsubscribe(view.impulse);
	view.impulse = impulse;

	// set as persistent when created from hook
	if (i < 0) {
		params = parentView.slice(i + 2);
		impulse.persist = true;
	}

	// call, then clear hydrate nodes and set as initialized
	const value = impulse();
	Object.assign(dom, { sibling });
	hydrateNodes = undefined;
	initialized = true;
	return value;
}
