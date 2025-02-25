import render from './view';

const appendChild = jest.fn();
const insertBefore = jest.fn();
const removeChild = jest.fn();
const updater = jest.fn((node, props) => Object.assign(node, props));
const converter = jest.fn(() => ['div']);
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
	promises = ['div'];
	framework = { promises, document, updater, converter };
	context = { abc: 123 };
	parentNode = document.createElement('div');
	dom = [parentNode];
	container = [parentNode, { '': {} }];
});

describe('render', () => {
	it('new boolean', () => {
		const layout = false;
		const actual = render(layout, framework, context, dom, container, 0);
		expect(actual).toEqual(undefined);
	});

	it('new number', () => {
		const layout = 123;
		const actual = render(layout, framework, context, dom, container, 0);
		expect(actual).toEqual([{ nodeValue: '123' }]);
	});

	it('new string', () => {
		const layout = 'abc';
		const actual = render(layout, framework, context, dom, container, 0);
		expect(actual).toEqual([{ nodeValue: 'abc' }]);
	});

	it('create element', () => {
		const layout = ['div', { '': 'key', lmno: 456 }, 'content'];
		const actual = render(layout, framework, context, dom, container, 0);
		expect(actual).toEqual([{ tagName: 'DIV', lmno: 456 }, { '': 'key' }, [{ nodeValue: 'content' }]]);
		expect(updater).toHaveBeenCalledWith(actual[0], { lmno: 456 });
		expect(appendChild).toHaveBeenCalledWith(actual[2][0]);
		expect(container[1]).toEqual({ '': { key: actual } });
	});

	it('update keyless element', () => {
		const node = { tagName: 'DIV', lmno: 456 };
		const ref = [node, {}, [{ nodeValue: 'content' }]];
		container.push(ref);
		const layout = ['div', { lmno: 456 }, 'content'];
		const actual = render(layout, framework, context, dom, container, 0);
		expect(actual).toEqual(ref);
		expect(updater).toHaveBeenCalledWith(node, { lmno: 456 });
		expect(appendChild).toHaveBeenCalledWith(actual[2][0]);
		expect(container[1]).toEqual({ '': {} });
	});

	it('update keyed element', () => {
		const node = { tagName: 'DIV', lmno: 456 };
		const ref = [node, { '': 'key' }, [{ nodeValue: 'content' }]];
		container[1][''].key = ref;
		const layout = ['div', { '': 'key', lmno: 456 }, 'content'];
		const actual = render(layout, framework, context, dom, container, 0);
		expect(actual).toEqual(ref);
		expect(updater).toHaveBeenCalledWith(node, { lmno: 456 });
		expect(appendChild).toHaveBeenCalledWith(actual[2][0]);
		expect(container[1]).toEqual({ '': { key: actual } });
	});

	it('new component', () => {
		const layout = { '': 'key', lmno: 456 };
		const actual = render(layout, framework, context, dom, container, 0);
		expect(actual).toEqual([{ tagName: 'DIV' }, expect.any(Function)]);
		expect(converter).toHaveBeenCalledWith({ '': {}, lmno: 456 });
	});

	it('new callback', () => {
		const layout = jest.fn(({ '': memo, abc }) => {
			memo.xyz = 789;
			return ['div', { abc }];
		});

		const actual = render(layout, framework, context, dom, container, 0);
		expect(actual).toEqual([{ tagName: 'DIV', abc: 123 }, expect.any(Function), ]);
		expect(layout).toHaveBeenCalledWith({ '': { xyz: 789 }, abc: 123 });
	});

	it('new fragment', () => {
		const callback = jest.fn(() => 'content');
		const layout = ['', { '': 'key', xyz: 789 }, callback];
		const actual = render(layout, framework, context, dom, container, 0);
		expect(actual).toEqual([{}, { '': 'key' }, [{ nodeValue: 'content' }, expect.any(Function)]]);
		expect(callback).toHaveBeenCalledWith({ '': {}, abc: 123, xyz: 789 });
		expect(context).toEqual({ abc: 123 });
	});
});
