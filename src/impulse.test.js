import { frameworks, virtualFramework } from '.';
import reconcile from './view';
import processImpulse from './impulse';

jest.mock('../reconcile');

describe('processImpulse', () => {
	const callback = jest.fn();
	let state, parentFiber, parentView, container, dom, hydrateNodes, outline, view, fiber;

	beforeEach(() => {
		const [document] = virtualFramework;
		container = document.createElement('div');
		state = {};
		parentFiber = [,];
		parentView = Object.assign([container], { keyedViews: {} });
		dom = { container };
		hydrateNodes = [];
		outline = ['span'];
		view = Object.assign([Object.assign(document.createElement('span'), { parentElement: container })], { keyedViews: {} });
		fiber = Object.assign([expect.any(Function)], { depth: 0, memos: [], index: 0, teardowns: [], subscriptionSet: new Set() });
		frameworks.splice(0, frameworks.length, virtualFramework);

		jest.clearAllMocks();
		callback.mockReturnValue(() => outline);

		reconcile.mockImplementation(() => {
			const [node] = parentView[1] = view;
			container.appendChild(node);
			dom.container = node;
		});
	});

	it('creates impulse', () => {
		processImpulse(callback, state, parentFiber, parentView, 0, dom, hydrateNodes);
		expect(callback).toHaveBeenCalledWith(state);
		expect(parentView).toEqual(Object.assign([container, view], { keyedViews: {} }));
		expect(view.fiber).toEqual(fiber);
		expect(dom).toEqual({ container: view[0], sibling: { container } });
	});

	it('overwrites impulse', () => {
		view.fiber = fiber;
		parentView[1] = view;
		processImpulse(callback, state, parentFiber, parentView, 0, dom, hydrateNodes);
		expect(callback).toHaveBeenCalledWith(state);
		expect(parentView).toEqual(Object.assign([container, view], { keyedViews: {} }));
		expect(view.fiber).toBe(fiber);
		expect(dom).toEqual({ container: view[0], sibling: { container } });
	});

	it('ignores static view', () => {
		const altView = Object.assign([...view], view);

		reconcile.mockImplementation(() => {
			const [node] = parentView[1] = altView;
			container.appendChild(node);
			dom.container = node;
		});

		parentView[1] = view;
		processImpulse(callback, state, parentFiber, parentView, 0, dom, hydrateNodes);
		expect(callback).toHaveBeenCalledWith(state);
		expect(parentView).toEqual(Object.assign([container, altView], { keyedViews: {} }));
		expect(parentView[1]).toBe(altView)
		expect(altView.fiber).toEqual(fiber);
		expect(altView.fiber).not.toBe(fiber);
		expect(dom).toEqual({ container: altView[0], sibling: { container } });
	});
});
