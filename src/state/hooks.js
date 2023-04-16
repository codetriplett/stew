import createState, { effects, scheduleDispatches } from '.';
import stew from '..';
import { executeCallback, fibers } from './fiber';

export function useMemo (callback, deps, ...rest) {
	// extract params and previous values
	if (stew.isServer) return executeCallback(callback, undefined, undefined);
	const cueCount = rest.length && typeof rest[0] !== 'function' ? rest.shift() : 0;
	const [callbackOnPersist] = rest;
	const [fiber] = fibers;
	const { memos, index } = fiber || [];
	let memo = memos?.[index];
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
	if (fiber) memos[fiber.index++] = memo;
	return persist && callbackOnPersist ? callbackOnPersist(memo[0]) : memo[0];
}

export function useEffect (...params) {
	// ignore for virtual document, otherwise extract previous values
	if (stew.isServer) return;
	const [fiber] = fibers;

	return new Promise(resolve => {
		// add effect
		effects.push(() => {
			fibers.unshift(fiber);
			const value = useMemo(...params);
			fibers.shift();
			if (fiber) fiber.teardowns.push(fiber.index);
			resolve(value);
		});

		// schedule resolution and return previous value
		scheduleDispatches([]);
	});
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
