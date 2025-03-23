import { print } from './test';
import { virtualDocument } from './document';
import { impulses } from './impulse';
import render, { remove, reconcile } from './view';

const convert = ({ text }) => text;
let text, fragment, element, context, nodes, container, map;

beforeEach(() => {
	text = {
		toString: expect.any(Function),
	};

	fragment = {
		...text,
		appendChild: expect.any(Function),
		insertBefore: expect.any(Function),
		removeChild: expect.any(Function),
		querySelector: expect.any(Function),
		querySelectorAll: expect.any(Function),
	};

	element = {
		...fragment,
		style: expect.any(Object),
		dataset: expect.any(Object),
		mode: null,
	};

	context = { '': convert };
	nodes = [{}];
	container = ['', {}];
	map = {};
});

describe('render', () => {
	describe('create', () => {
		it('undefined', () => {
			const actual = render(undefined, context, virtualDocument, nodes, container, 0, map);
			expect(actual).toEqual(undefined);
			expect(container).toEqual(['', {},, undefined]);
		});

		it('number', () => {
			const actual = render(123, context, virtualDocument, nodes, container, 0, map);
			expect(actual).toEqual({ ...text, nodeValue: '123' });
			expect(container).toEqual(['', {},, actual]);
		});

		it('string', () => {
			const actual = render('abc', context, virtualDocument, nodes, container, 0, map);
			expect(actual).toEqual({ ...text, nodeValue: 'abc' });
			expect(container).toEqual(['', {},, actual]);
		});

		it('callback', () => {
			context.lmno = 456;
			const callback = jest.fn().mockReturnValue('callback');
			const actual = render(callback, context, virtualDocument, nodes, container, 0, map);
			expect(actual).toEqual({ ...text, nodeValue: 'callback' });
			expect(container).toEqual(['', {},, actual]);
			expect(callback).toHaveBeenCalledWith({ '': 0, lmno: 456 });
		});

		it('fragment', () => {
			const layout = ['', { '': 'key', lmno: 456 }, 'first', 'last']
			const actual = render(layout, context, virtualDocument, nodes, container, 0, map);
			expect(actual).toEqual(['', null, undefined, { ...text, nodeValue: 'first' }, { ...text, nodeValue: 'last' }]);
			expect(container).toEqual(['', {},, actual]);
			expect(map).toEqual({ key: actual });
			expect(print(actual)).toEqual('firstlast');
		});

		it('heading', () => {
			const layout = [1, { '': 'key', lmno: 456 }, 'first', 'last']
			const actual = render(layout, context, virtualDocument, nodes, container, 0, map);
			expect(nodes).toEqual([{}, actual[2]]);
			expect(container).toEqual(['', {},, actual]);
			expect(map).toEqual({ key: actual });
			expect(String(actual[2])).toEqual('<h1 lmno="456">first<!---->last</h1>');

			expect(actual).toEqual([1, null,
				{ ...element, tagName: 'H1', lmno: 456, childNodes: [
					{ ...text, nodeValue: 'first' },
					{ ...text, nodeValue: 'last' },
				] },
				...actual[2].childNodes,
			]);
		});

		it('element', () => {
			const layout = ['div', { '': 'key', lmno: 456 }, 'first', 'last']
			const actual = render(layout, context, virtualDocument, nodes, container, 0, map);
			expect(nodes).toEqual([{}, actual[2]]);
			expect(container).toEqual(['', {},, actual]);
			expect(map).toEqual({ key: actual });
			expect(String(actual[2])).toEqual('<div lmno="456">first<!---->last</div>');

			expect(actual).toEqual(['div', null,
				{ ...element, tagName: 'DIV', lmno: 456, childNodes: [
					{ ...text, nodeValue: 'first' },
					{ ...text, nodeValue: 'last' },
				] },
				...actual[2].childNodes,
			]);
		});

		it('portal', () => {
			const node = virtualDocument.createElement('div');
			const layout = [node, { '': 'key', lmno: 456 }, 'first', 'last']
			const actual = render(layout, context, virtualDocument, nodes, container, 0, map);
			expect(nodes).toEqual([{}]);
			expect(container).toEqual(['', {},, actual]);
			expect(map).toEqual({ key: actual });
			expect(String(actual[2])).toEqual('<div lmno="456">first<!---->last</div>');

			expect(actual).toEqual([node, null,
				{ ...element, tagName: 'DIV', lmno: 456, childNodes: [
					{ ...text, nodeValue: 'first' },
					{ ...text, nodeValue: 'last' },
				] },
				...actual[2].childNodes,
			]);
		});

		it('impulse', () => {
			const callback = ({ type }, ...children) => [type, {}, ...children];
			const layout = [callback, { '': 'key', type: 'div' }, 'first', 'last']
			const actual = render(layout, context, virtualDocument, nodes, container, 0, map);
			expect(nodes).toEqual([{}, actual[2][2]]);
			expect(container).toEqual(['', {},, actual]);
			expect(map).toEqual({ key: actual });
			
			expect(actual).toEqual([callback, {},
				['div', null,
					{ ...element, tagName: 'DIV', childNodes: [
						{ ...text, nodeValue: 'first' },
						{ ...text, nodeValue: 'last' },
					] },
					...actual[2][2].childNodes,
				],
				[expect.any(Function), impulses[0]],
			]);
		});

		it('attachment', () => {
			const actual = render({ '': 'key', text: 'attachment' }, context, virtualDocument, nodes, container, 0, map);
			expect(nodes).toEqual([{}, actual[2]]);
			expect(container).toEqual(['', {},, actual]);
			expect(map).toEqual({ key: actual });

			expect(actual).toEqual([convert, {},
				{ ...text, nodeValue: 'attachment' },
				[expect.any(Function), impulses[0]],
			]);
		});
	});

	describe('update', () => {

	});

	describe('hydrate', () => {

	});
});
