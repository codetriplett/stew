import { frameworks, virtualFramework } from '../view/dom';
import processFiber, { fibers } from './fiber';

function testArrObj (actual, arr, obj, expected) {
	if (expected) expect(actual).toBe(expected);
	expect([...actual]).toEqual(arr);
	const props = Object.entries(actual).filter(([name]) => !(name in arr));
	expect(Object.fromEntries(props)).toEqual(obj);
	return actual;
}

describe('processFiber', () => {
	let document, state, parentFiber, parentView, container, dom, fiber;

	beforeEach(() => {
		[document] = virtualFramework;
		container = document.createElement('div');
		state = {};
		parentFiber = [,];
		parentView = Object.assign([container], { keyedViews: {} });
		dom = { container };
		fiber = Object.assign([expect.any(Function)], { depth: 0, memos: [], index: 0, teardowns: [], subscriptionSet: new Set() });
		frameworks.splice(0, frameworks.length, virtualFramework);
		fibers.splice(0, fibers.length, parentFiber);
	});

	it('creates fiber', () => {
		const callback = () => 'abc';
		const actual = processFiber(callback, state, parentView, 0, dom);
		expect(parentFiber).toEqual([, actual.fiber]);
		testArrObj(parentView, [container], { keyedViews: {} });
		testArrObj(actual, [expect.any(Object)], { fiber: expect.any(Array) });

		testArrObj(actual.fiber, [expect.any(Function)], {
			depth: 1,
			registry: new Set(),
			teardowns: [],
			view: actual
		});

		expect(String(actual[0])).toEqual('abc');
	});

	it('reuses fiber', () => {
		const view = processFiber(() => {}, state, parentView, 0, dom);
		const callback = () => 'abc';
		parentFiber.splice(1);
		const { fiber } = parentView[1] = view;
		const actual = processFiber(callback, state, parentView, 0, dom);
		expect(parentFiber).toEqual([, fiber]);
		testArrObj(parentView, [container, view], { keyedViews: {} });
		testArrObj(actual, [expect.any(Object)], { fiber: expect.any(Array) });

		testArrObj(actual.fiber, [expect.any(Function)], {
			depth: 1,
			registry: new Set(),
			teardowns: [],
			view: actual
		}, fiber);
	});

	it('handles own dispatch', () => {
		const callback = jest.fn().mockReturnValue('abc');
		const oldView = processFiber(callback, state, parentView, 0, dom);
		const { fiber } = parentView[1] = oldView;
		callback.mockReturnValue(undefined);
		const [impulse] = fiber;
		impulse.queued = true;
		const newView = impulse();
		expect(impulse.queued).toEqual(false);
		expect(parentFiber).toEqual([, fiber]);
		expect(newView).not.toBe(oldView);
		testArrObj(parentView, [container, newView], { keyedViews: {} });
	});

	it('deactivates child fibers', () => {
		const teardown = jest.fn();
		const subscriptions = new Set();
		const registry = new Set([subscriptions]);
		const childFiber = Object.assign([], { view: [], teardowns: [teardown], registry })
		childFiber.view.fiber = childFiber;
		subscriptions.add(childFiber);

		const callback = jest.fn().mockReturnValue('abc');
		const oldView = processFiber(callback, state, parentView, 0, dom);
		const { fiber } = parentView[1] = oldView;
		fiber.push(childFiber);
		fiber[0]();

		expect(subscriptions).toEqual(new Set());
		expect(teardown).toHaveBeenCalledWith();
		expect(childFiber.view.fiber).toEqual(undefined);
	});
});
