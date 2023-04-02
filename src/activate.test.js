import activate, { impulses, queue, effects, useMemo, useState } from './activate';
import reconcile from './reconcile';
import { frameworks, virtualDocument } from '.';

jest.mock('./reconcile');

describe('activate', () => {
	const callback = jest.fn();
	let updater, state, parentView, dom, hydrateNodes, framework, parentImpulse, impulse, outline, frameworksCopy, impulsesCopy;

	beforeEach(() => {
		parentImpulse = () => {};
		state = {};
		parentView = [];
		dom = {};
		hydrateNodes = [];
		updater = () => {};
		framework = [virtualDocument, updater, {}];
		parentImpulse = () => {};
		outline = ['div', {}];
		frameworks.splice(0);
		frameworks.unshift(framework);
		impulses.splice(0);
		impulses.unshift(parentImpulse);

		jest.clearAllMocks();

		callback.mockImplementation(() => {
			parentView[1] = [{}];
			return outline;
		});

		reconcile.mockImplementation(() => {
			frameworksCopy = [...frameworks];
			impulsesCopy = [...impulses];
			[impulse] = impulses;
		});
	});

	it('activates the first time', () => {
		activate(callback, state, parentView, 0, dom, hydrateNodes);
		expect(impulse).toEqual(expect.any(Function));
		expect(impulse.parentImpulse).toBe(parentImpulse);
		expect(callback).toHaveBeenCalledWith(state);
		expect(reconcile).toHaveBeenCalledWith(outline, state, parentView, 0, { sibling: {} }, hydrateNodes);
		// expect(reconcile.mock.calls[0][4]).toBe(dom);
		expect(frameworksCopy).toEqual([framework, framework]);
		expect(impulsesCopy).toEqual([impulse, parentImpulse]);
		expect(frameworks).toEqual([framework]);
		expect(impulses).toEqual([parentImpulse]);
	});

	// TODO: test second activate that remembers the hooks and view from before

	it('retriggers impulse', () => {
		activate(callback, state, parentView, 0, dom, hydrateNodes);
		jest.clearAllMocks();
		impulse();
		expect(impulse).toEqual(expect.any(Function));
		expect(impulse.parentImpulse).toBe(parentImpulse);
		expect(callback).toHaveBeenCalledWith(state);
		expect(reconcile).toHaveBeenCalledWith(outline, state, parentView, 0, {}, undefined);
		expect(dom).toEqual({ sibling: {} });
		// expect(reconcile.mock.calls[0][4]).toBe(dom);
		expect(frameworksCopy).toEqual([framework, framework]);
		expect(impulsesCopy).toEqual([impulse, parentImpulse]);
		expect(frameworks).toEqual([framework]);
		expect(impulses).toEqual([parentImpulse]);
	});
});

describe('useMemo', () => {
	let memos, view, impulse;

	beforeEach(() => {
		memos = [];
		view = { memos, index: 0, teardowns: [] };
		impulse = Object.assign(() => {}, { view });
		impulses.splice(0);
		impulses.unshift(impulse);
	});

	it('initializes memo', () => {
		const callback = jest.fn().mockReturnValue('abc');
		const actual = useMemo(callback, [123]);
		expect(callback).toHaveBeenCalled();
		expect(actual).toEqual('abc');
		expect(view).toEqual({ memos, index: 1, teardowns: [] })
		expect(memos).toEqual([['abc', 123]]);
	});

	it('reuses memo', () => {
		const callback = jest.fn().mockReturnValue('abc');
		useMemo(callback, [123]);
		callback.mockClear();
		callback.mockReturnValue('xyz');
		view.index = 0;
		const actual = useMemo(callback, [123]);
		expect(callback).not.toHaveBeenCalled();
		expect(actual).toEqual('abc');
		expect(view).toEqual({ memos, index: 1, teardowns: [] })
		expect(memos).toEqual([['abc', 123]]);
	});

	it('updates memo', () => {
		const callback = jest.fn().mockReturnValue('abc');
		useMemo(callback, [123]);
		callback.mockClear();
		callback.mockReturnValue('xyz');
		view.index = 0;
		const actual = useMemo(callback, [789]);
		expect(callback).toHaveBeenCalled();
		expect(actual).toEqual('xyz');
		expect(view).toEqual({ memos, index: 1, teardowns: [] })
		expect(memos).toEqual([['xyz', 789]]);
	});
});

describe('createState', () => {
	const impulse = jest.fn();
	let updater, framework;

	beforeEach(() => {
		jest.clearAllMocks();
		updater = () => {};
		framework = [{ ...virtualDocument }, updater];
		frameworks.splice(0);
		frameworks.unshift(framework);
		impulse.subscriptionsSet = new Set();
		impulses.splice(0);
		impulses.unshift(impulse);
	});

	it('reacts to changes to read properties', async () => {
		const actual = useState({ str: 'abc' });
		const before = actual.str;
		expect(before).toEqual('abc');
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(impulse).not.toHaveBeenCalled();
		actual.str = 'xyz';
		expect(queue).toEqual(new Set([impulse]));
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(impulse).toHaveBeenCalledWith();
		const after = actual.str;
		expect(after).toEqual('xyz');
	});
	
	it('prevents duplicate executions', async () => {
		const actual = useState({ str: 'abc', num: 123 });
		actual.str;
		actual.str;
		actual.num;
		actual.num;
		actual.str = 'lmno';
		actual.str = 'xyz';
		actual.num = 456;
		actual.num = 789;
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(impulse.mock.calls).toEqual([[]]);
	});
	
	it('prevents nested executions', async () => {
		const parentImpulse = jest.fn();
		impulse.parentImpulse = parentImpulse;
		queue.add(parentImpulse);
		const actual = useState({ str: 'abc' });
		actual.str;
		actual.str = 'xyz';
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(parentImpulse.mock.calls).toEqual([[]]);
		expect(impulse).not.toHaveBeenCalled();
	});
});
