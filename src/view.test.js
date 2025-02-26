import render, { onRender } from './view';

const appendChild = jest.fn();
const insertBefore = jest.fn();
const removeChild = jest.fn();
const updater = jest.fn();
const converter = jest.fn();
let document, promises, framework, context, parentNode, dom, container;

beforeEach(() => {
	const base = {
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
	updater.mockImplementation((node, props) => Object.assign(node, props));
	converter.mockImplementation(({ key, ...props }) => ['div', props]);
	promises = ['div'];
	framework = { promises, document, updater, converter };
	context = { key: 1, abc: 123 };
	parentNode = document.createElement('div');
	dom = [parentNode];
	container = [parentNode, { '': {} }];
});

describe('render', () => {
	describe('create', () => {
		it('undefined', () => {
			const layout = false;
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual(undefined);
		});

		it('null', () => {
			const layout = false;
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual(undefined);
		});

		it('boolean', () => {
			const layout = false;
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual(undefined);
		});

		it('number', () => {
			const layout = 123;
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual([{ nodeValue: '123' }]);
		});

		it('string', () => {
			const layout = 'abc';
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual([{ nodeValue: 'abc' }]);
		});

		it('attachment', () => {
			// TODO: impulse of converter with their own props, has no children params
			// - could be achieved with an inline function that calls converter directly, and wrapped in fragment for key if needed
			// - this method allows layouts to be fully defined in JSON though
			const layout = { key: 'lmno', lmno: 456 };
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual([{ tagName: 'DIV', lmno: 456 }, { '': '' }]);
			expect(converter).toHaveBeenCalledWith({ key: 'lmno', lmno: 456 });
			expect(container[1]).toEqual({ '': {} });
		});

		it('promise', async () => {
			const layout = Promise.resolve('content');
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual([{ tagName: 'DIV' }, layout]);
			expect(converter).not.toHaveBeenCalled();
			expect(container[1]).toEqual({ '': {} });
			await onRender();
			expect(actual).toEqual([{ tagName: 'DIV' }, layout, [{ nodeValue: 'content' }]]);
			expect(appendChild).toHaveBeenCalledWith(actual[2][0]);
		});

		it('impulse', () => {
			// TODO: custom impulse with context as props, has no children params
		});

		it('fragment', () => {
			const layout = ['', { key: 'lmno', lmno: 456 }, 'content'];
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual([{}, { '': 'lmno' }, [{ nodeValue: 'content' }]]);
			expect(updater).not.toHaveBeenCalled();
			expect(appendChild).toHaveBeenCalledWith(actual[2][0]);
			expect(container[1]).toEqual({ '': { lmno: actual } });
		});

		it('heading', () => {
			const layout = [2, { lmno: 456 }, 'content'];
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual([{ tagName: 'H3', lmno: 456 }, { '': '' }, [{ nodeValue: 'content' }]]);
			expect(updater).toHaveBeenCalledWith(actual[0], { lmno: 456 });
			expect(appendChild).toHaveBeenCalledWith(actual[2][0]);
			expect(container[1]).toEqual({ '': {} });
		});

		it('element', () => {
			const layout = ['div', { key: 'lmno', lmno: 456 }, 'content'];
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual([{ tagName: 'DIV', lmno: 456 }, { '': 'lmno' }, [{ nodeValue: 'content' }]]);
			expect(updater).toHaveBeenCalledWith(actual[0], { lmno: 456 });
			expect(appendChild).toHaveBeenCalledWith(actual[2][0]);
			expect(container[1]).toEqual({ '': { lmno: actual } });
		});

		it('portal', () => {
			const node = document.createElement('div');
			const layout = [node, { key: 'lmno', lmno: 456 }, 'content'];
			const actual = render(layout, framework, context, dom, container, 0);
			expect(actual).toEqual([{ tagName: 'DIV', lmno: 456 }, { '': 'lmno' }, [{ nodeValue: 'content' }]]);
			expect(actual[0]).toBe(node);
			expect(updater).toHaveBeenCalledWith(actual[0], { lmno: 456 });
			expect(appendChild).toHaveBeenCalledWith(actual[2][0]);
			expect(container[1]).toEqual({ '': { lmno: actual } });
		});

		it('component', () => {
			// TODO: custom impulse with its own props and children (what most people would be used to)
			// - could be achieved with inline function that calls custom function directly, and wrapped in fragment for key if needed
			// - this resembles other frameworks more closely
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
