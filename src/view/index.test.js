import reconcileNode from '.';
import { fibers } from '../state/fiber';
import { frameworks, converters, virtualDocument, virtualFramework } from './dom';

describe('reconcileNode', () => {
	const convert = jest.fn();
	let parentFiber, parentView, container, dom;

	beforeEach(() => {
		jest.clearAllMocks();
		convert.mockReturnValue({ toString: () => '' });
		container = virtualDocument.createElement('div');
		parentFiber = [,];
		parentView = [container]
		dom = { container };
		frameworks.splice(0, frameworks.length, virtualFramework);
		converters.splice(0, converters.length, [0, convert, {}, []]);
		fibers.splice(0, fibers.length, parentFiber);
	});

	it('processes undefined view', () => {
		const actual = reconcileNode(undefined, {}, parentView, 0, dom);
		expect(actual).toEqual([]);
	});

	it('processes null view', () => {
		const actual = reconcileNode(null, {}, parentView, 0, dom);
		expect(actual).toEqual([]);
	});

	it('persists view', () => {
		const view = parentView[1] = [];
		const actual = reconcileNode(true, {}, parentView, 0, dom);
		expect(actual).toBe(view);
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

	it('processes static view', () => {
		const node = virtualDocument.createElement('div');
		convert.mockReturnValue(node);
		const actual = reconcileNode({}, {}, parentView, 0, dom);
		expect(actual).toEqual(Object.assign([expect.any(Object)], { keyedViews: {} }));
		expect(String(actual[0])).toEqual('<div></div>');
		expect(parentFiber).toEqual([, actual.fiber]);
	});
});
