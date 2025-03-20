import render from './render';

const appendChild = jest.fn();
const insertBefore = jest.fn();
const removeChild = jest.fn();
const update = jest.fn();
const convert = jest.fn();
let context, document, container, map;

beforeEach(() => {
	const base = {
		childNodes: {
			value: [],
		},
		appendChild: {
			value: appendChild,
		},
		insertBefore: {
			value: insertBefore,
		},
		removeChild: {
			value: removeChild,
		},
	};

	document = {
		createTextNode: nodeValue => ({ nodeValue }),
		createElement: tagName => Object.defineProperties({ tagName: tagName.toUpperCase() }, base),
		createDocumentFragment: () => Object.defineProperties({}, base),
	};

	jest.clearAllMocks();
	convert.mockReturnValue(update);
	context = { '': convert, lmno: 456 };
	map = {};
	// dom = [parentNode];
	container = ['div', {}, document.createElement('div')];
});

// render(layout, document, container, i, map, context, module)
describe('render', () => {
	describe.only('create', () => {
		it('undefined', () => {
			const layout = false;
			const actual = render(layout, context, document, container, 0, map);
			expect(actual).toEqual(undefined);
			expect(container[3]).toEqual(undefined);
		});

		it('null', () => {
			const layout = false;
			const actual = render(layout, context, document, container, 0, map);
			expect(actual).toEqual(undefined);
			expect(container[3]).toEqual(undefined);
		});

		it('boolean', () => {
			const layout = false;
			const actual = render(layout, context, document, container, 0, map);
			expect(actual).toEqual(undefined);
		});

		it('number', () => {
			const layout = 123;
			const actual = render(layout, context, document, container, 0, map);
			expect(actual).toEqual({ nodeValue: '123' });
			expect(container[3]).toEqual(actual);
		});

		it('string', () => {
			const layout = 'abc';
			const actual = render(layout, context, document, container, 0, map);
			expect(actual).toEqual({ nodeValue: 'abc' });
			expect(container[3]).toEqual(actual);
		});

		it('inline', () => {
			const layout = jest.fn(() => 'content');
			const actual = render(layout, context, document, container, 0, map);
			expect(actual).toEqual({ nodeValue: 'content' });
			expect(container[3]).toEqual(actual);
		});

		it('attachment', () => {
			const layout = { lmno: 456 };
			let actual = render(layout, context, document, container, 0, map);
			expect(actual).toEqual({ tagName: 'DIV' });
			expect(convert).toHaveBeenCalledWith({ '': actual, ...layout });
			expect(update).not.toHaveBeenCalled();
			expect(container[3]).toEqual([null, undefined, actual, update]);
			jest.clearAllMocks();
			actual = render(layout, context, document, container, 0, map);
			expect(convert).not.toHaveBeenCalled();
			expect(update).toHaveBeenCalledWith(layout);
			expect(container[3]).toEqual([null, undefined, actual, update]);
			
		});

		it('fragment', () => {
			const layout = ['', { lmno: 456 }, 'content'];
			const actual = render(layout, context, document, container, 0, map);
			expect(actual).toEqual([{ nodeValue: 'content' }]);
			expect(container[3]).toEqual(['', {},, actual[0]]);
		});

		it('element', () => {
			const layout = ['div', { lmno: 456 }, 'content'];
			const actual = render(layout, context, document, container, 0, map);
			expect(actual).toEqual({ tagName: 'DIV', lmno: 456 });
			expect(container[3]).toEqual(['div', {}, actual, { nodeValue: 'content' }]);
			expect(appendChild).toHaveBeenCalledWith(container[3][3]);
		});

		it('heading', () => {
			const layout = [1, { lmno: 456 }, 'content'];
			const actual = render(layout, context, document, container, 0, map);
			expect(actual).toEqual({ tagName: 'H1', lmno: 456 });
			expect(container[3]).toEqual([1, {}, actual, { nodeValue: 'content' }]);
			expect(appendChild).toHaveBeenCalledWith(container[3][3]);
		});

		it.skip('component', () => {
			const callback = jest.fn(() => ['div', {}]);
			const layout = [callback, { lmno: 456 }, 'content'];
			const actual = render(layout, context, container, 0, map, module, document);
			expect(actual).toEqual([{ tagName: 'DIV' }, expect.any(Function)]);
			expect(callback).toHaveBeenCalledWith({ key: {}, lmno: 456 }, 'content');
		});

		it.skip('portal', () => {
			const node = document.createElement('div');
			const layout = [node, { lmno: 456 }, 'content'];
			const actual = render(layout, context, container, 0, map, module, document);
			expect(actual).toEqual([{ tagName: 'DIV', lmno: 456 }, { '': [actual[2][0]] }, [{ nodeValue: 'content' }]]);
			expect(actual[0]).toBe(node);
			expect(appendChild).toHaveBeenCalledWith(actual[2][0]);
		});
	});

	describe('update', () => {
		it('number', () => {
			let layout = 123;
			const ref = render(layout, framework, context, dom, container, 0);
			container[2] = ref;
			layout = 789;
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual([{ nodeValue: '789' }]);
			expect(actual).toBe(ref);
		});

		it('string', () => {
			let layout = 'abc';
			const ref = render(layout, framework, context, dom, container, 0);
			container[2] = ref;
			layout = 'xyz';
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual([{ nodeValue: 'xyz' }]);
			expect(actual).toBe(ref);
		});

		it('attachment', () => {
			let layout = { lmno: 123 };
			const ref = render(layout, framework, context, dom, container, 0);
			container[2] = ref;
			layout = { lmno: 789 };
			converter.mockClear();
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual([{ tagName: 'DIV', lmno: 789 }, { '': '' }]);
			expect(converter).toHaveBeenCalledWith({ lmno: 789});
		});

		it('element', () => {
			let layout = ['div', { lmno: 123 }, 'abc'];
			const ref = render(layout, framework, context, dom, container, 0);
			container[2] = ref;
			layout = ['div', { lmno: 789 }, 'xyz'];
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual([{ tagName: 'DIV', lmno: 789 }, { '': '' }, [{ nodeValue: 'xyz' }]]);
			expect(actual).toBe(ref);
		});
	});

	// it('new impulse', () => {
	// 	const layout = jest.fn(({ '': memo, abc }) => {
	// 		memo.xyz = 789;
	// 		return ['div', { abc }];
	// 	});

	// 	const actual = render(layout, framework, context, dom, container, 0);
	// 	expect(actual).toEqual([{ tagName: 'DIV', abc: 123 }, expect.any(Function), ]);
	// 	expect(layout).toHaveBeenCalledWith({ '': { xyz: 789 }, abc: 123 });
	// });

	// it('new fragment', () => {
	// 	const callback = jest.fn(() => 'content');
	// 	const layout = ['', { '': 'lmno', xyz: 789 }, callback];
	// 	const actual = render(layout, framework, context, dom, container, 0);
	// 	expect(actual).toEqual([{}, { '': 'lmno' }, [{ nodeValue: 'content' }, expect.any(Function)]]);
	// 	expect(callback).toHaveBeenCalledWith({ '': {}, abc: 123, xyz: 789 });
	// 	expect(context).toEqual({ abc: 123 });
	// });
});
