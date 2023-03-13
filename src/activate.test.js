import activate, { frameworks, impulses } from './activate';
import reconcile from './reconcile';
import { defaultUpdater, virtualDocument } from '.';

jest.mock('./reconcile');

describe('activate', () => {
	const callback = jest.fn();
	let state, parentView, dom, hydrateNodes, framework, parentImpulse, impulse, outline, frameworksCopy, impulsesCopy;

	beforeEach(() => {
		parentImpulse = () => {};
		state = {};
		parentView = [];
		dom = {};
		hydrateNodes = [];
		framework = [virtualDocument, defaultUpdater];
		parentImpulse = () => {};
		outline = ['div', {}];
		frameworks.splice(0);
		frameworks.unshift(framework);
		impulses.splice(0);
		impulses.unshift(parentImpulse);

		jest.clearAllMocks();

		callback.mockImplementation(() => {
			parentView[2] = [{}];
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
		expect(reconcile).toHaveBeenCalledWith(outline, state, parentView, 0, dom, hydrateNodes);
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
		expect(reconcile).toHaveBeenCalledWith(outline, state, parentView, 0, dom, undefined);
		// expect(reconcile.mock.calls[0][4]).toBe(dom);
		expect(frameworksCopy).toEqual([framework, framework]);
		expect(impulsesCopy).toEqual([impulse, parentImpulse]);
		expect(frameworks).toEqual([framework]);
		expect(impulses).toEqual([parentImpulse]);
	});
});
