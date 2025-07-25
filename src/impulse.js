import { isServer } from './document';
import render, { remove, reconcile } from './view';
import createState, { schedule } from './state';
import parse from './markdown';

export const stack = [];
export const effects = [];

export function execute (callback, ...params) {
	try {
		return callback?.(...params);
	} catch (err) {
		console.error(err);
	}
}

export function processEffects () {
	for (const effect of effects.splice(0)) {
		const [teardown, followup, ...deps] = effect;
		const [callback, ...prev] = followup;
		const param = typeof teardown === 'function' ? execute(teardown, ...prev) : teardown;
		effect.splice(0, 2, execute(callback, param, ...deps), undefined);
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
	const [info = [,,,,, []]] = stack;
	const memo = info[5].shift() || [];
	let [value,, ...prev] = memo;
	info.push(memo);

	if (typeof callback === 'string') {
		deps = [callback, ...deps];
		callback = parse;
	}

	// TODO: can there be a way to omit mount from effect, and just process updates?
	if (memo.length > 1 && deps.every((value, i) => value === prev[i])) {
		// if memo should remain the same
		memo.splice(deps.length + 2);
		return value;
	} else if (!callback) {
		if (intermediate && !isServer) {
			// if effect should be scheduled
			memo.splice(0, memo.length, value, [intermediate, ...prev], ...deps);
			effects.push(memo);
		}

		return;
	}

	// if memo should be updated
	switch (typeof callback) {
		case 'function': {
			value = callback(...deps);
			break;
		}
		case 'object': {
			value = createState(callback);
			break;
		}
	}

	if (rest.length > 1 && value instanceof Promise) {
		// if it is async
		value.catch(() => fallback ?? intermediate).then(value => {
			memo[0] = value;
			schedule(new Set([impulse]));
		});

		const impulse = stack[0]?.[1];
		value = !memo.length ? intermediate : memo[0];
	}

	memo.splice(0, memo.length, value, undefined, ...deps);
	return value;
}

export default function renderImpulse (info, props, children, context, document, nodes) {
	if (info[1]) {
		const [update] = info[1];
		return update(props, ...children);
	}

	const [callback] = info;
	const [parentNode] = nodes;
	let anchor, prevParams, prevNodes;

	// TODO: put anchor at the end of slice
	// - store nodes[nodes.length - 1] to find the start of slice (in case impulses before this one have updated)
	// - that stored node will never change, since impulses are the only ones that do and always end with their anchor
	// - anchor can always be used as sibling during reconciliation
	const update = (...params) => {
		let siblings;
		info.push(context[''], info.splice(4));
		stack.unshift(info);

		if (!params.length) {
			const index = nodes.indexOf(anchor);
			siblings = nodes.splice(index - prevNodes.length);
			params = prevParams;
		}

		const layout = execute(callback, ...params);
		const prevProxy = info[3];
		const { length } = nodes;
		const proxy = render(layout, context, document, nodes, info, 0, {});
		const nextNodes = nodes.slice(length);

		if (proxy !== prevProxy) {
			remove(prevProxy, parentNode);
		}
	
		if (siblings) {
			nodes.push(...siblings);
			reconcile(parentNode, nextNodes, prevNodes, anchor);
		}

		stack.shift();
		info.splice(4, 2);
		prevParams = params;
		prevNodes = nextNodes;
	};

	anchor = document.createTextNode('');
	info.splice(1, 3, [update, new Set(), ...stack.map(info => info[1])], anchor, null);
	update(props, ...children);
	nodes.push(...prevNodes, anchor);
}
