import stew from '.';
import { isServer } from './document';
import render, { remove, reconcile } from './view';
import createState, { schedule } from './state';

export const impulses = [];
export const effects = [];
let prevMemos = [];
let activeInfo;

export function execute (callback, ...params) {
	try {
		return callback?.(...params);
	} catch (err) {
		console.error(err);
	}
}

export function processEffects () {
	for (const effect of effects.splice(0)) {
		const [followup, teardown] = effect;
		const param = typeof teardown === 'function' && execute(teardown);
		effect.splice(0, 2, undefined, execute(followup, param));
	}
}

// TODO: change useEffect to expect deps array instead of having useMemo handle it
// - it will make this code less complicated
// - pass stew as fallback to indicate it should be treated as useEffect
// - it's sort of like an async action that is waiting on stew to finish what it's doing
// TODO: have stew(() => {}) be a way of creating a detached impulse
// - this pairs nicely with stew({}) creating the state impulses subscribe to
// - have stew(() => {}) return the teardown function that will unsubscribe the impulse
// - this could unlock some neat messaging potential in the backend
// - essentially call renderImpulse with a lot of placeholder params for container, nodes, etc
// - create teardown callback outside of renderImpulse (maybe inside stew function code)
// - make teardown work like the function returned for views
//   - pass in function to swap
//   - pass in nothing to suspend or resume
//   - in both cases clearing the variable that holds the suspend/resume/swap will allow it to garbage collect the tree
export function processMemo (callback, ...rest) {
	if (!activeInfo) {
		return;
	}

	const [deps = [], fallback] = rest;
	const memo = prevMemos.shift() || [undefined];
	let value = memo[1];
	activeInfo.push(memo);

	// TODO: can there be a way to omit mount from effect, and just process updates?
	if (memo.length > 1 && deps.every((value, i) => value === memo[i + 2])) {
		// if memo should remain the same
		memo.splice(deps.length + 2);
		return value;
	} else if (callback === stew) {
		if (fallback && !isServer) {
			// if effect should be scheduled
			memo[0] = fallback;
			effects.push(memo);
		}

		return;
	}

	// if memo should be updated
	if (typeof callback === 'function') {
		value = callback(value);
	} else {
		value = createState(callback);
	}

	const [, prevValue] = memo.splice(0, 2, undefined, value);

	if (rest.length > 1 && value instanceof Promise) {
		// if it is async
		value.then(value => {
			memo[1] = value;
			schedule(new Set([impulse]));
		});

		const [impulse] = impulses;
		value = prevValue;
	}

	memo.splice(1, memo.length, value, ...deps);
	return value || fallback;
}

export default function renderImpulse (info, object, children, context, document, nodes) {
	if (!info[1]) {
		info[1] = [, new Set(), ...impulses.slice(0, -1)];
	}

	// TODO: rename ref params throughout code base
	const { ref, ...props } = object;
	const [, impulse] = info;
	const [parentNode] = nodes;
	const refIndex = ref?.length;
	const nodeIndex = nodes.length;
	let prevNodes;

	const update = () => {
		const [callback,, prevProxy] = info;
		const activeInfoBackup = activeInfo;
		const sibling = prevNodes?.[prevNodes?.length - 1]?.nextSibling;
		impulses.unshift(impulse);
		prevMemos = info.splice(3);
		activeInfo = info;
		const layout = execute(callback, props, ...children);

		if (document) {
			const proxy = render(layout || '', context, document, nodes, info, -1, {});

			if (prevNodes) {
				reconcile(parentNode, nodes.slice(1), prevNodes, sibling);

				if (proxy !== prevProxy) {
					remove(prevProxy, parentNode);
				}

				prevNodes = nodes.splice(1);
			} else {
				prevNodes = nodes.slice(nodeIndex);
				nodes = [parentNode];
			}

			if (Array.isArray(ref)) {
				ref[refIndex] = [...prevNodes];
			}
		} else {
			info[2] = layout;
		}

		activeInfo = activeInfoBackup;
		impulses.shift();
	};

	impulse[0] = update;
	update();
}
