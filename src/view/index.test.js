import reconcileNode from '.';
import { frameworks, virtualDocument, virtualFramework } from './dom';

describe('reconcileNode', () => {
	let parentFiber, parentView, container, dom;

	beforeEach(() => {
		frameworks.splice(0, frameworks.length, virtualFramework);
		container = virtualDocument.createElement('div');
		parentFiber = [,];
		parentView = [container]
		dom = { container };
	});

	it('processes empty view', () => {
		const actual = reconcileNode(undefined, {}, parentFiber, parentView, 0, dom);
		expect(actual).toEqual([]);
	});

	it('processes text view', () => {
		const actual = reconcileNode('abc', {}, parentFiber, parentView, 0, dom);
		expect(actual).toEqual([expect.any(Object)]);
		expect(String(actual[0])).toEqual('abc');
	});

	it('processes element view', () => {
		const actual = reconcileNode(['div'], {}, parentFiber, parentView, 0, dom);
		expect(actual).toEqual(Object.assign([expect.any(Object)], { keyedViews: {} }));
		expect(String(actual[0])).toEqual('<div></div>');
	});

	it('processes dynamic view', () => {
		const actual = reconcileNode(() => ['div'], {}, parentFiber, parentView, 0, dom);
		expect(actual).toEqual(Object.assign([expect.any(Object)], { keyedViews: {}, fiber: expect.any(Array) }));
		expect(String(actual[0])).toEqual('<div></div>');
		expect(parentFiber).toEqual([, actual.fiber]);
	});
});
