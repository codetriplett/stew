import reconcile, { update, remove } from './reconcile';
import { frameworks, virtualDocument } from '.';

export const impulses = [];
export const queue = new Set();
export const effects = new Set();
const resets = [];
let timeout;

function screen (impulse) {
	// check if impulse will be covered by queued parent
	const { parentImpulse } = impulse;
	if (!parentImpulse) return false;
	if (queue.has(parentImpulse)) return true;
	return screen(parentImpulse);
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
		const queueCopy = [...queue];
		effects.clear();
		queue.clear();
		timeout = undefined;

		// resolve effects
		for (const effect of effectsCopy) {
			effect();
		}

		// filter out any impulses that will already be covered by a parent update
		for (const impulse of queueCopy) {
			const isCovered = screen(impulse);
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
		impulses.view.memos[0].impulse = undefined;
		impulses = [impulses];
	}

	for (const impulse of impulses) {
		if (impulse.view.memos[0].impulse) continue;
		const { subscriptionsSet, childImpulses, view: { memos } } = impulse;
		const [{ teardowns }] = memos;

		// remove impulse from subscriptions
		for (const subscriptions of subscriptionsSet) {
			subscriptions.delete(impulse);
		}

		// call teardown
		for (const index of teardowns) {
			const [teardown, ...prevDeps] = memos[index];
			if (typeof teardown === 'function') teardown(prevDeps);
		}

		// reset set and continue unsubscribing children
		subscriptionsSet.clear();
		unsubscribe(childImpulses);
	}
}

export function useMemo (callback, deps, cueCount) {
	const memos = impulses[0]?.view?.memos || [{}];
	const [options] = memos;
	let memo = memos[options.index];
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
	memos[options.index++] = memo;
	return memo[0];
}

export function useEffect (...params) {
	const [{ view: { memos } }] = impulses;
	const [{ index, teardowns }] = memos;

	// make async
	schedule(() => {
		useMemo(...params);
		teardowns.push(index);
	});

	// return previous value
	return memos[index];
}

export function useImpulse (callback, ...rest) {
	return useMemo(([prevValue, view] = [], prevDeps = []) => {
		// activate also returns view in this case so it can be reused to attach memos to
		return activate(callback, prevValue, [view, ...prevDeps], -2);
	}, ...rest)[0];
}

export function createState (object, ...rest) {
	// prepare state and check for key to reference self
	const state = Array.isArray(object) ? [] : {};
	const key = /^string|number$/.test(typeof rest[0]) ? rest.shift() : undefined;

	// prepare cues and create entries
	const cues = Array.isArray(rest[0]) ? rest.shift() : [];
	const cuesObject = Object.fromEntries(cues.map(cue => [cue]));
	const entries = Object.entries({ ...cuesObject, ...object });

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
				schedule(subscriptions);
				subscriptions.clear();
			},
		});
	}

	// set self reference if needed and return state
	return key === undefined ? state : Object.defineProperty(state, key, { value: state, writeable: false });
}

export default function activate (callback, state, parentView, i, dom = {}, hydrateNodes) {
	// persist parent framework and dom reference object
	const [framework] = frameworks;
	const [parentImpulse] = impulses;
	const childImpulses = [];
	const view = parentView?.[i + 2] || [];
	const sibling = { ...dom };
	let params = [];
	let initialized = false;

	// wrap in setup and teardown steps and store as new callback to subscribe to state property changes
	function impulse (newState) {
		// resurface stored framework
		frameworks.unshift(framework);
		impulses.unshift(impulse);
		unsubscribe(childImpulses.splice(0));
		Object.assign(view.memos[0], { index: 1, teardowns: [] });
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
			const newView = parentView[i + 2];

			if (newView !== view) {
				// remove old nodes and subscriptions
				if (view.length) remove(view, dom.container);
				view.splice(0, view.length, ...newView);
				parentView[i + 2] = view;
			}
		} else if (parentView[0]) {
			// process attribute update
			const [, updater, defaultProps] = framework;
			update(parentView[0], outline, updater, defaultProps);
		} else {
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
		view,
		subscriptionsSet: new Set()
	});

	// set parent impulse and memos
	parentImpulse?.childImpulses?.push?.(impulse);
	if (i >= 0) parentView?.childImpulses?.push?.(impulse);
	if (!view.memos) view.memos = [{ teardowns: [] }];
	const prevImpulse = view.memos[0].impulse;
	if (prevImpulse && prevImpulse !== impulse) unsubscribe(prevImpulse);

	// set as persistent when created from hook
	if (i < 0) {
		params = parentView.slice(i + 3);
		view.memos[0].impulse = impulse;
	}

	// call, then clear hydrate nodes and set as initialized
	const value = impulse();
	Object.assign(dom, { sibling });
	hydrateNodes = undefined;
	initialized = true;
	return value;
}
