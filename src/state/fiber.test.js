import { frameworks, virtualFramework } from '../view/dom';
import processFiber from './fiber';

describe('processFiber', () => {
	let document, state, parentFiber, parentView, container, dom, hydrateNodes, view, fiber;

	beforeEach(() => {
		[document] = virtualFramework;
		container = document.createElement('div');
		state = {};
		parentFiber = [,];
		parentView = Object.assign([container], { keyedViews: {} });
		dom = { container };
		hydrateNodes = [];
		fiber = Object.assign([expect.any(Function)], { depth: 0, memos: [], index: 0, teardowns: [], subscriptionSet: new Set() });
		frameworks.splice(0, frameworks.length, virtualFramework);
	});

	it.only('creates fiber', () => {
		const callback = () => 'abc';
		const actual = processFiber(callback, state, parentFiber, parentView, 0, dom, hydrateNodes);
		const fiber = Object.assign([expect.any(Function)], { depth: 1, memos: [], registry: new Set(), index: 0, teardowns: [], view: actual });
		// expect(parentFiber).toEqual([, fiber]);
		expect(parentView).toEqual(Object.assign([container], { keyedViews: {} }));
		expect(actual).toEqual(Object.assign([expect.anything()], { fiber }));
		expect(String(actual[0])).toEqual('xyz');
	});

	it.only('reuses fiber', () => {
		const callback = () => 'xyz';
		const actual = processFiber(callback, state, parentFiber, parentView, 0, dom, hydrateNodes);
		expect(parentView).toEqual(Object.assign([container], { keyedViews: {} }));
		expect(actual).toEqual(Object.assign([expect.anything()], { fiber: expect.anything() }));
		expect(String(actual[0])).toEqual('xyz');
	});

	// it('overwrites impulse', () => {
	// 	view.fiber = fiber;
	// 	parentView[1] = view;
	// 	processFiber(callback, state, parentFiber, parentView, 0, dom, hydrateNodes);
	// 	expect(callback).toHaveBeenCalledWith(state);
	// 	expect(parentView).toEqual(Object.assign([container, view], { keyedViews: {} }));
	// 	expect(view.fiber).toBe(fiber);
	// 	expect(dom).toEqual({ container: view[0], sibling: { container } });
	// });

	// it('ignores static view', () => {
	// 	const altView = Object.assign([...view], view);

	// 	reconcileNode.mockImplementation(() => {
	// 		const [node] = parentView[1] = altView;
	// 		container.appendChild(node);
	// 		dom.container = node;
	// 	});

	// 	parentView[1] = view;
	// 	processFiber(callback, state, parentFiber, parentView, 0, dom, hydrateNodes);
	// 	expect(callback).toHaveBeenCalledWith(state);
	// 	expect(parentView).toEqual(Object.assign([container, altView], { keyedViews: {} }));
	// 	expect(parentView[1]).toBe(altView)
	// 	expect(altView.fiber).toEqual(fiber);
	// 	expect(altView.fiber).not.toBe(fiber);
	// 	expect(dom).toEqual({ container: altView[0], sibling: { container } });
	// });
});
