import reconcile, { update, remove } from './reconcile';
import { frameworks, virtualDocument } from '.';

export const impulses = [];
export const effects = [];
export const queue = new Set();
const resets = [];
let timeout;

function schedule (subscriptions) {
	// ignore async action for virtual document
	if (frameworks[0]?.[0] === virtualDocument) return;

	// add to queue
	if (typeof subscriptions === 'function') {
		effects.push(subscriptions);
	} else {
		for (const impulse of subscriptions) {
			queue.add(impulse);
		}
	}

	// schedule update after all main thread tasks have finished
	timeout = timeout !== undefined ? timeout : setTimeout(() => {
		// prepare copies
		const resetsCopy = resets.splice(0);
		const queueLayers = {};

		// organized impulses
		for (const impulse of [...queue]) {
			const { depth } = impulse;
			const queueLayer = queueLayers[depth];
			if (queueLayer) queueLayer.push(impulse);
			else queueLayers[depth] = [impulse];
			impulse.queued = true;
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
				if (impulse.queued) impulse();
			}
		}

		// reset all active cues
		for (const [state, name] of resetsCopy) {
			state[name] = undefined;
		}
	}, 0);
}

// cleans up old listeners on state properties before impulse refresh or removal
function unsubscribe (trees) {
	// clear flag when unsubscribing hook-based impulse
	if (!Array.isArray(trees)) {
		trees.persist = false;
		trees = [trees.tree];
	}

	for (const tree of trees) {
		const [impulse] = tree;
		if (impulse.persist) continue;
		const { subscriptionsSet } = tree;

		// remove impulse from subscriptions
		for (const subscriptions of subscriptionsSet) {
			subscriptions.delete(impulse);
		}

		// reset set and continue unsubscribing children
		subscriptionsSet.clear();
		unsubscribe(tree.slice(1));
	}
}

// recursively call teardowns
export function deactivate (tree) {
	const { memos, teardowns } = tree;

	// deactivate children
	for (const tree of tree.slice(1)) {
		deactivate(tree);
	}

	// call teardown
	for (const index of teardowns) {
		const [teardown, ...prevDeps] = memos[index];
		if (typeof teardown === 'function') teardown(prevDeps);
	}
}

// TODO: add option for function after deps (or after cueCount if that exists) that runs if memo is not called
// - prevValue is passed to it but function is mostly so we can return true to avoid processing child element
// - useMemo(() => ...sublayout, [...deps], () => true) // return sublayout when changes occur, otherwise return true which will keep previous view
export function useMemo (callback, deps, ...rest) {
	const cueCount = rest.length && typeof rest[0] !== 'function' ? rest.shift() : 0;
	const [followup] = rest;
	const [{ view } = {}] = impulses;
	const { memos, index } = view || [];
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
	return persist && followup ? followup(memo[0]) : memo[0];
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

// TODO: store hydrate notes in dom
// - activate can clear it before reaction when creating new dom object
// - one last thing to pass all around, especially when it only used initially
export default function activate (callback, state, parentTree, parentView, i, dom = {}, hydrateNodes) {
	// persist parent framework and dom reference object
	const [framework] = frameworks;
	const sibling = { ...dom };
	let view = i === undefined ? parentView : parentView[i + 1];
	const tree = view.tree || Object.assign([], { depth: impulses.length, memo: [], subscriptionSet: new Set() });
	let params = [];

	// wrap in setup and teardown steps and store as new callback to subscribe to state property changes
	function impulse (newState) {
		// resurface stored framework
		frameworks.unshift(framework);
		impulses.unshift(impulse);
		unsubscribe(tree.splice(1));
		Object.assign(tree, { index: 0, teardowns: [] });
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
			if (view) dom = { ...sibling };
			reconcile(outline, state, parentView, i, dom, hydrateNodes);
			const newView = parentView[i + 1];

			// replace old view if it represents new ref
			if (view !== newView) {
				if (view) remove(view, dom.container);
				view = newView;
				view.tree = tree;
			}
		} else if (parentView[0]) {
			// process attribute update
			const [, updater, defaultProps] = framework;
			update(parentView[0], outline, updater, defaultProps, initialized);
		} else if (initialized) {
			// process state update
			for (const impulse of childImpulses) {
				impulse(outline);
			}
		}

		// reset stack
		impulses.shift();
		frameworks.shift();
		impulse.queued = false;
		return outline;
	}

	// attach impulse to parent and bind with tree
	parentTree.push(impulse);
	impulse.tree = tree;
	tree.impulse = impulse;

	// set as persistent when created from hook
	if (i < 0) {
		params = parentView.slice(i + 2);
		impulse.persist = true;
	}

	// call, then clear hydrate nodes and set as initialized
	const value = impulse();
	Object.assign(dom, { sibling });
	hydrateNodes = undefined;
	return value;
}
