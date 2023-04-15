import { useMemo, useEffect, useState } from './hooks';
import { fibers } from './fiber';
import { frameworks, virtualFramework } from '../view/dom';

describe('useMemo', () => {
	let memos, fiber;

	beforeEach(() => {
		memos = [];
		fiber = Object.assign([], { memos, index: 0, teardowns: [] });
		fibers.splice(0, fibers.length, fiber);
		frameworks.splice(0, frameworks.length, virtualFramework);
	});

	it('initializes memo', () => {
		const callback = jest.fn().mockReturnValue('abc');
		const actual = useMemo(callback, [123]);
		expect(callback).toHaveBeenCalled();
		expect(actual).toEqual('abc');
		expect(fiber).toEqual(Object.assign([], { memos, index: 1, teardowns: [] }));
		expect(memos).toEqual([['abc', 123]]);
	});

	it('reuses memo', () => {
		const callback = jest.fn().mockReturnValue('abc');
		useMemo(callback, [123]);
		callback.mockClear();
		callback.mockReturnValue('xyz');
		fiber.index = 0;
		const actual = useMemo(callback, [123]);
		expect(callback).not.toHaveBeenCalled();
		expect(actual).toEqual('abc');
		expect(fiber).toEqual(Object.assign([], { memos, index: 1, teardowns: [] }))
		expect(memos).toEqual([['abc', 123]]);
	});

	it('updates memo', () => {
		const callback = jest.fn().mockReturnValue('abc');
		useMemo(callback, [123]);
		callback.mockClear();
		callback.mockReturnValue('xyz');
		fiber.index = 0;
		const actual = useMemo(callback, [789]);
		expect(callback).toHaveBeenCalled();
		expect(actual).toEqual('xyz');
		expect(fiber).toEqual(Object.assign([], { memos, index: 1, teardowns: [] }));
		expect(memos).toEqual([['xyz', 789]]);
	});
});
