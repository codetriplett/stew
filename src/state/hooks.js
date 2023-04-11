import { frameworks } from '../view/dom';
import { executeCallback, fibers } from './fiber';
import createState, { effects, scheduleCallbacks } from '.';

export function useMemo (callback, deps, ...rest) {
	// extract params and previous values
	if (frameworks[0]?.isServer) return executeCallback(callback, undefined, undefined);
	const cueCount = rest.length && typeof rest[0] !== 'function' ? rest.shift() : 0;
	const [callbackOnPersist] = rest;
	const [fiber] = fibers;
	const { m: memos, i: index } = fiber || [];
	let memo = memos?.[index]
	let prevDeps, persist;

	if (memo) {
		prevDeps = memo.splice(1);

		persist = deps && deps.length === prevDeps?.length && deps.every((it, i) => {
			return it === prevDeps[i] || i < cueCount && it === undefined;
		});
	} else {
		memo = [];
	}

	if (!persist) memo[0] = executeCallback(callback, memo[0], prevDeps);
	if (deps) memo.push(...deps);
	if (fiber) memos[fiber.i++] = memo;
	return persist && callbackOnPersist ? callbackOnPersist(memo[0]) : memo[0];
}

export function useEffect (...params) {
	// ignore for virtual document, otherwise extract previous values
	if (frameworks[0].isServer) return;
	const [fiber] = fibers;
	const { m: memos, i: index, t: teardowns } = fiber;

	// add effect
	effects.push(() => {
		fibers.unshift(fiber);
		useMemo(...params);
		fibers.shift();
		teardowns.push(index);
	});

	// schedule resolution and return previous value
	scheduleCallbacks([]);
	return memos[index];
}

// put string first
export function useState (...params) {
	// extract key
	const key = /^string|number$/.test(typeof params[0]) ? params.shift() : undefined;
	let object = params.shift();

	return useMemo((...params) => {
		if (typeof object === 'function') object = executeCallback(object, ...params);
		return createState(object, key);
	}, ...params);
}
