import { print, text, fragment, element } from './validate';
import stew from './stew';
import render, { remove, reconcile } from './view';

const convert = ({ text }) => text;
let customModule, context, parentNode, nodes, container, map;

beforeEach(() => {
	customModule = { default: [convert] };
	context = { '': customModule };
	parentNode = {};
	nodes = [parentNode];
	container = ['', {}];
	map = {};
});

describe('render', () => {
	describe('create', () => {
		it('undefined', () => {
			const actual = render(undefined, context, stew, nodes, container, -1, map);
			expect(actual).toEqual(undefined);
			expect(container).toEqual(['', {},, undefined]);
		});

		it('number', () => {
			const actual = render(123, context, stew, nodes, container, -1, map);
			expect(actual).toEqual({ ...text, nodeValue: '123' });
			expect(container).toEqual(['', {}, actual]);
		});

		it('string', () => {
			const actual = render('abc', context, stew, nodes, container, -1, map);
			expect(actual).toEqual({ ...text, nodeValue: 'abc' });
			expect(container).toEqual(['', {}, actual]);
		});

		it('callback', () => {
			context.lmno = 456;
			const callback = jest.fn().mockReturnValue('callback');
			const actual = render(callback, context, stew, nodes, container, -1, map);
			expect(actual).toEqual({ ...text, nodeValue: 'callback' });
			expect(container).toEqual(['', {}, actual]);
			expect(callback).toHaveBeenCalledWith({ '': customModule, lmno: 456 }, parentNode);
		});

		it('fragment', () => {
			const layout = ['', { '': 'key', lmno: 456 }, 'first', 'last']
			const actual = render(layout, context, stew, nodes, container, -1, map);
			expect(actual).toEqual(['', {}, null, { ...text, nodeValue: 'first' }, { ...text, nodeValue: 'last' }]);
			expect(container).toEqual(['', {}, actual]);
			expect(map).toEqual({ key: actual });
			expect(print(actual)).toEqual('firstlast');
		});

		it('heading', () => {
			const layout = [1, { '': 'key', lmno: 456 }, 'first', 'last']
			const actual = render(layout, context, stew, nodes, container, -1, map);
			expect(nodes).toEqual([parentNode, actual[2]]);
			expect(container).toEqual(['', {}, actual]);
			expect(map).toEqual({ key: actual });
			expect(String(actual[2])).toEqual('<h1 lmno="456">first<!---->last</h1>');

			expect(actual).toEqual([1, { '': new Set(['lmno']) },
				{ ...element, tagName: 'H1', lmno: 456, childNodes: [
					{ ...text, nextSibling: expect.any(Object), nodeValue: 'first' },
					{ ...text, nodeValue: 'last' },
				] },
				...actual[2].childNodes,
			]);
		});

		it('element', () => {
			const layout = ['div', { '': 'key', lmno: 456 }, 'first', 'last']
			const actual = render(layout, context, stew, nodes, container, -1, map);
			expect(nodes).toEqual([parentNode, actual[2]]);
			expect(container).toEqual(['', {}, actual]);
			expect(map).toEqual({ key: actual });
			expect(String(actual[2])).toEqual('<div lmno="456">first<!---->last</div>');

			expect(actual).toEqual(['div', { '': new Set(['lmno']) },
				{ ...element, tagName: 'DIV', lmno: 456, childNodes: [
					{ ...text, nextSibling: expect.any(Object), nodeValue: 'first' },
					{ ...text, nodeValue: 'last' },
				] },
				...actual[2].childNodes,
			]);
		});

		it.skip('portal', () => {
			const node = stew.createElement('div');
			const layout = [node, { '': 'key', lmno: 456 }, 'first', 'last']
			const actual = render(layout, context, stew, nodes, container, -1, map);
			expect(nodes).toEqual([parentNode]);
			expect(container).toEqual(['', {}, actual]);
			expect(map).toEqual({ key: actual });
			expect(String(actual[2])).toEqual('<div lmno="456">first<!---->last</div>');

			expect(actual).toEqual([node, { '': new Set(['lmno']) },
				{ ...element, tagName: 'DIV', lmno: 456, childNodes: [
					{ ...text, nextSibling: expect.any(Object), nodeValue: 'first' },
					{ ...text, nodeValue: 'last' },
				] },
				...actual[2].childNodes,
			]);
		});

		it('impulse', () => {
			const callback = ({ type }, ...children) => [type, {}, ...children];
			const layout = [callback, { '': 'key', type: 'div' }, 'first', 'last']
			const actual = render(layout, context, stew, nodes, container, -1, map);
			expect(nodes).toEqual([parentNode, actual[2][2]]);
			expect(container).toEqual(['', {}, actual]);
			expect(map).toEqual({ key: actual });
			
			expect(actual).toEqual([callback,
				[expect.any(Function), new Set()],
				['div', { '': new Set() },
					{ ...element, tagName: 'DIV', childNodes: [
						{ ...text, nextSibling: expect.any(Object), nodeValue: 'first' },
						{ ...text, nodeValue: 'last' },
					] },
					...actual[2][2].childNodes,
				],
			]);
		});

		it('attachment', () => {
			const actual = render({ text: 'attachment' }, context, stew, nodes, container, -1, map);
			expect(nodes).toEqual([parentNode, actual]);
			expect(container).toEqual(['', {}, actual]);
			expect(actual).toEqual({ ...text, nodeValue: 'attachment' });
		});
	});

	describe('update', () => {

	});

	describe('hydrate', () => {

	});
});
