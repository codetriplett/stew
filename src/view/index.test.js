import reconcileNode from '.';
import { fibers } from '../state/fiber';
import { frameworks, virtualDocument, virtualFramework } from './dom';

describe('reconcileNode', () => {
	let parentFiber, parentView, container, dom;

	beforeEach(() => {
		container = virtualDocument.createElement('div');
		parentFiber = [,];
		parentView = [container]
		dom = { container };
		frameworks.splice(0, frameworks.length, virtualFramework);
		fibers.splice(0, fibers.length, parentFiber);
	});

	it('processes empty view', () => {
		const actual = reconcileNode(undefined, {}, parentView, 0, dom);
		expect(actual).toEqual([]);
	});

	it('processes text view', () => {
		const actual = reconcileNode('abc', {}, parentView, 0, dom);
		expect(actual).toEqual([expect.any(Object)]);
		expect(String(actual[0])).toEqual('abc');
	});

	it('processes element view', () => {
		const actual = reconcileNode(['div'], {}, parentView, 0, dom);
		expect(actual).toEqual(Object.assign([expect.any(Object)], { keyedViews: {}, newKeyedViews: undefined }));
		expect(String(actual[0])).toEqual('<div></div>');
	});

	it('processes dynamic view', () => {
		const actual = reconcileNode(() => ['div'], {}, parentView, 0, dom);
		expect(actual).toEqual(Object.assign([expect.any(Object)], { keyedViews: {}, newKeyedViews: undefined, fiber: expect.any(Array) }));
		expect(String(actual[0])).toEqual('<div></div>');
		expect(parentFiber).toEqual([, actual.fiber]);
	});
});
