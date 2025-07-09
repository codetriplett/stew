import { isServer } from './document';
import render, { remove, reconcile } from './view';
import createState, { schedule } from './state';
import parse from './markdown';

export const impulses = [];
export const effects = [];
export let prevMemos = [];
let activeInfo, activeModule;

// TODO: check if this can be incorporated into the effects array
// - maybe first item can be for hook context, and then spliced out before processing effects
// - could be used both by stew and impulse code
export function setModule (customModule) {
	activeModule = customModule;
}

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
		const param = typeof teardown === 'function' ? execute(teardown) : undefined;
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
	let [deps = [], intermediate, fallback] = rest;
	const memo = prevMemos.shift() || [undefined];
	let value = memo[1];
	activeInfo?.push?.(memo);

	if (typeof callback === 'string') {
		deps = [callback, ...deps];
		callback = parse;

		if (deps.length < 3) {
			deps[2] = activeModule;
		}
	}

	// TODO: can there be a way to omit mount from effect, and just process updates?
	if (memo.length > 1 && deps.every((value, i) => value === memo[i + 2])) {
		// if memo should remain the same
		memo.splice(deps.length + 2);
		return value;
	} else if (!callback) {
		if (intermediate && !isServer) {
			// if effect should be scheduled
			memo[0] = intermediate;
			effects.push(memo);
		}

		return;
	}

	// if memo should be updated
	if (typeof callback === 'function') {
		value = callback(...deps);
	} else {
		value = createState(callback);
	}

	if (rest.length > 1 && value instanceof Promise) {
		// if it is async
		value.catch(() => fallback ?? intermediate).then(value => {
			memo[1] = value;
			schedule(new Set([impulse]));
		});

		const [impulse] = impulses;
		value = memo.length === 1 ? intermediate : memo[1];
	}

	memo.splice(0, memo.length, undefined, value, ...deps);
	return value;
}

export default function renderImpulse (info, object, children, context, document, nodes) {
	if (!info[1]) {
		info[1] = [, new Set(), ...impulses];
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
		setModule(context['']);
		const layout = execute(callback, props, ...children);
		setModule(undefined);

		if (document) {
			const proxy = render(layout || '', context, document, nodes, info, -1, {});

			if (prevNodes) {
				const nextNodes = nodes.splice(1);
				reconcile(parentNode, nextNodes, prevNodes, sibling);
				prevNodes = nextNodes;
			} else {
				prevNodes = nodes.slice(nodeIndex);
				nodes = [parentNode];
			}
			
			if (proxy !== prevProxy) {
				remove(prevProxy, parentNode);
			}

			if (Array.isArray(ref)) {
				ref[refIndex] = [...prevNodes];
			}
		} else {
			info[2] = layout;
		}

		activeInfo = activeInfoBackup;
		prevMemos.splice(0);
		impulses.shift();
	};

	impulse[0] = update;
	update();
}
