import reconcile from './proto';

const updater = jest.fn((node, props) => Object.assign(node, props));
const converter = jest.fn(({ '': document }) => document.createElement('div'));
let document, context, dom, container;

beforeEach(() => {
	jest.clearAllMocks();

	document = {
		createTextNode: nodeValue => ({ nodeValue }),
		createElement: tagName => ({ tagName: tagName.toUpperCase() }),
	};

	context = { abc: 123 };
	dom = { parent: {}, sibling: {} };
	container = [document.createElement('div'), { '': {} }];
});

// info
// ref

// ['tag', { '': key, ...props }, ...children]
// [node, { '': key, ...refs }, ...refs]

// ['', { '': key, ...props }, ...children]: creates a new context for later use (spreads new props onto parent context props)
// [context, { '': key, ...refs }, ...refs]
// - add contexts to WeakSet to identify them (treat as node otherwise)

// { '': key, ...props }
// [node, key]

// context => { ...code }
// [callback, context, ref, ...other]

// function pick (container, i, key) {
// 	const index = container[1][key] ?? i;
// 	return container.splice(index + 2, 1);
// }

describe('reconcile', () => {
	it('new boolean', () => {
		const info = false;
		const actual = reconcile(info, document, updater, converter, context, dom, container, 0);
		expect(actual).toEqual([]);
	});

	it('new number', () => {
		const info = 123;
		const actual = reconcile(info, document, updater, converter, context, dom, container, 0);
		expect(actual).toEqual([{ nodeValue: '123' }]);
	});

	it('new string', () => {
		const info = 'abc';
		const actual = reconcile(info, document, updater, converter, context, dom, container, 0);
		expect(actual).toEqual([{ nodeValue: 'abc' }]);
	});

	it('create element', () => {
		const info = ['div', { '': 'key', lmno: 456 }, 'content'];
		const actual = reconcile(info, document, updater, converter, context, dom, container, 0);
		expect(actual).toEqual([{ tagName: 'DIV', lmno: 456 }, { '': 'key' }, [{ nodeValue: 'content' }]]);
		expect(updater).toHaveBeenCalledWith(actual[0], { lmno: 456 });
		expect(container[1]).toEqual({ '': { key: 0 } });
	});

	it('update keyless element', () => {
		const node = { tagName: 'DIV', lmno: 456 };
		const ref = [node, {}, [{ nodeValue: 'content' }]];
		container.push(ref);
		const info = ['div', { lmno: 456 }, 'content'];
		const actual = reconcile(info, document, updater, converter, context, dom, container, 0);
		expect(actual).toEqual(ref);
		expect(updater).toHaveBeenCalledWith(node, { lmno: 456 });
		expect(container[1]).toEqual({ '': {} });
	});

	it('update keyed element', () => {
		const node = { tagName: 'DIV', lmno: 456 };
		const ref = [node, { '': 'key' }, [{ nodeValue: 'content' }]];
		container[1][''].key = ref;
		const info = ['div', { '': 'key', lmno: 456 }, 'content'];
		const actual = reconcile(info, document, updater, converter, context, dom, container, 0);
		expect(actual).toEqual(ref);
		expect(updater).toHaveBeenCalledWith(node, { lmno: 456 });
		expect(container[1]).toEqual({ '': { key: 0 } });
	});

	it('new component', () => {
		const info = { '': 'key', lmno: 456 };
		const actual = reconcile(info, document, updater, converter, context, dom, container, 0);
		expect(actual).toEqual([{ tagName: 'DIV' }, 'key']);
		expect(converter).toHaveBeenCalledWith({ '': document, lmno: 456 });
	});

	// TODO: figure out if there is a replacement for key with this
	// - setting '' prop of context doesn't work since key should determines what context to pass to it in the first place
	// - could just wrap it in a fragment if its position with parent is dynamic (actually looks pretty good)
	// - swapping functions out for others and having them share the same context/ref might actually be useful in certain situations anyway

	/*
		items.map(item => ['', {}, context => {
			
		}]);
	*/
	it('new fiber', () => {
		const info = jest.fn(memo => {
			const { abc } = memo[''];
			memo.xyz = 789;
			return ['div', { abc }];
		});

		const actual = reconcile(info, document, updater, converter, context, dom, container, 0);
		expect(actual).toEqual([info, { '': context, xyz: 789 }, [{ tagName: 'DIV', abc: 123 }, {}]]);
		expect(info).toHaveBeenCalledWith(actual[1]);
	});

	it('new fragment', () => {
		const callback = jest.fn(() => 'content');
		const info = ['', { '': 'key', xyz: 789 }, callback];
		const actual = reconcile(info, document, updater, converter, context, dom, container, 0);
		expect(actual).toEqual([{}, { '': 'key' }, [callback, { '': { abc: 123, xyz: 789 } }, [{ nodeValue: 'content' }]]]);
		expect(callback).toHaveBeenCalledWith(actual[2][1]);
		expect(context).toEqual({ abc: 123 });
	});
});
