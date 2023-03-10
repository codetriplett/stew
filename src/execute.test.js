import execute, { frameworks, impulses } from './execute';
import reconcile from './reconcile';
import { defaultUpdater, virtualDocument } from '.';

jest.mock('./reconcile');

describe('execute', () => {
	const callback = jest.fn();
	let state, parentView, dom, hydrateNodes, framework, parentImpulse, impulse, item, view, frameworksCopy, impulsesCopy;

	beforeEach(() => {
		parentImpulse = () => {};
		state = {};
		parentView = [];
		dom = {};
		hydrateNodes = [];
		framework = [virtualDocument, defaultUpdater];
		parentImpulse = () => {};
		item = ['div', {}];
		frameworks.splice(0);
		frameworks.unshift(framework);
		impulses.splice(0);
		impulses.unshift(parentImpulse);

		jest.clearAllMocks();

		callback.mockImplementation((...params) => {
			parentView[2] = [{}];
			view = params[1];
			return item;
		});

		reconcile.mockImplementation(() => {
			frameworksCopy = [...frameworks];
			impulsesCopy = [...impulses];
			[impulse] = impulses;
		});
	});

	it('executes the first time', () => {
		execute(callback, state, parentView, 0, dom, hydrateNodes);
		expect(impulse).toEqual(expect.any(Function));
		expect(impulse.parentImpulse).toBe(parentImpulse);
		expect(callback).toHaveBeenCalledWith(state, view);
		expect(view).toEqual([{}]);
		expect(reconcile).toHaveBeenCalledWith(item, state, parentView, 0, dom, hydrateNodes);
		// expect(reconcile.mock.calls[0][4]).toBe(dom);
		expect(frameworksCopy).toEqual([framework, framework]);
		expect(impulsesCopy).toEqual([impulse, parentImpulse]);
		expect(frameworks).toEqual([framework]);
		expect(impulses).toEqual([parentImpulse]);
	});

	// TODO: test second execute that remembers the hooks and view from before

	it('retriggers impulse', () => {
		execute(callback, state, parentView, 0, dom, hydrateNodes);
		jest.clearAllMocks();
		impulse();
		expect(impulse).toEqual(expect.any(Function));
		expect(impulse.parentImpulse).toBe(parentImpulse);
		expect(callback).toHaveBeenCalledWith(state, view);
		expect(view).toEqual([{}]);
		expect(reconcile).toHaveBeenCalledWith(item, state, parentView, 0, dom, hydrateNodes);
		// expect(reconcile.mock.calls[0][4]).toBe(dom);
		expect(frameworksCopy).toEqual([framework, framework]);
		expect(impulsesCopy).toEqual([impulse, parentImpulse]);
		expect(frameworks).toEqual([framework]);
		expect(impulses).toEqual([parentImpulse]);
	});
});
