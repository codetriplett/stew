import resolve from './resolve';
import execute, { documents } from './execute';
import observe from './observe';

jest.mock('./execute');
jest.mock('./observe');

describe('resolve', () => {
	let document, state, parentElement, srcRef, ctx;

	beforeEach(() => {
		document = {
			createTextNode (nodeValue) {
				return { nodeValue };
			},
			createElement (tagName) {
				return {
					tagName,
					childNodes: [],
					appendChild (child) {
						this.childNodes.push(child);
					},
					insertBefore (sibling, child) {
						const { childNodes } = this;
						const index = childNodes.indexOf(sibling);
						childNodes.splice(index, 0, child);
					},
				};
			},
		};

		state = {};
		parentElement = document.createElement('div');
		srcRef = [parentElement, {}];
		ctx = { state, parentElement };
		documents.splice(0);
		documents.unshift(document);

		jest.clearAllMocks();
		execute.mockReturnValue({ nodeValue: 'xyz' });
		observe.mockReturnValue({ key: 'value' });
	});

	it('resolves null', () => {
		const actual = resolve(null, ctx, srcRef, 0);
		expect(parentElement.childNodes).toEqual([]);
		expect(srcRef).toEqual([parentElement, {}, actual]);
		expect(actual).toEqual(undefined);
	});

	it('resolves undefined', () => {
		const actual = resolve(undefined, ctx, srcRef, 0);
		expect(parentElement.childNodes).toEqual([]);
		expect(srcRef).toEqual([parentElement, {}, actual]);
		expect(actual).toEqual(undefined);
	});

	it('resolves false', () => {
		const actual = resolve(false, ctx, srcRef, 0);
		expect(parentElement.childNodes).toEqual([]);
		expect(srcRef).toEqual([parentElement, {}, actual]);
		expect(actual).toEqual(undefined);
	});

	it('resolves true', () => {
		const actual = resolve(true, ctx, srcRef, 0);
		expect(parentElement.childNodes).toEqual([]);
		expect(srcRef).toEqual([parentElement, {}, actual]);
		expect(actual).toEqual(undefined);
	});

	it('resolves zero', () => {
		const actual = resolve(0, ctx, srcRef, 0);
		expect(parentElement.childNodes).toEqual([actual]);
		expect(srcRef).toEqual([parentElement, {}, actual]);
		expect(actual).toEqual({ nodeValue: '0' });
	});

	it('resolves number', () => {
		const actual = resolve(123, ctx, srcRef, 0);
		expect(parentElement.childNodes).toEqual([actual]);
		expect(srcRef).toEqual([parentElement, {}, actual]);
		expect(actual).toEqual({ nodeValue: '123' });
	});

	it('resolves text node', () => {
		const actual = resolve('abc', ctx, srcRef, 0);
		expect(parentElement.childNodes).toEqual([actual]);
		expect(srcRef).toEqual([parentElement, {}, actual]);
		expect(actual).toEqual({ nodeValue: 'abc' });
	});

	it('resolves dynamic node', () => {
		const callback = () => {};
		const actual = resolve(callback, ctx, srcRef, 0);
		expect(parentElement.childNodes).toEqual([actual]);
		expect(srcRef).toEqual([parentElement, {}, actual]);
		expect(execute).toHaveBeenCalledWith(callback, ctx, srcRef, 0, undefined);
		expect(actual).toEqual({ nodeValue: 'xyz' });
	});

	it('resolves static node', () => {
		const node = { tagName: 'div' };
		const actual = resolve(node, ctx, srcRef, 0);
		expect(parentElement.childNodes).toEqual([actual]);
		expect(srcRef).toEqual([parentElement, {}, actual]);
		expect(actual).toBe(node);
	});

	it('resolves fragment node', () => {
		const object = { key: 'value' };
		const template = ['', object, 'xyz'];
		const actual = resolve(template, ctx, srcRef, 0);
		expect(parentElement.childNodes).toEqual([{ nodeValue: 'xyz' }]);
		expect(srcRef).toEqual([parentElement, {}, actual]);
		expect(observe).toHaveBeenCalledWith(object);

		expect(actual).toEqual([{
			...ctx,
			state: object
		}, {}, { nodeValue: 'xyz' }]);
	});

	it('resolves element node', () => {
		const template = ['div', { className: 'abc' }, 'xyz'];
		const actual = resolve(template, ctx, srcRef, 0);
		expect(parentElement.childNodes).toEqual([actual]);
		expect(srcRef).toEqual([parentElement, {}, actual]);

		expect(actual).toEqual([{
			appendChild: expect.anything(),
			tagName: 'div',
			className: 'abc',
			childNodes: [
				// {
				// 	appendChild: expect.anything(),
				// 	childNodes: [{ nodeValue: 'xyz' }],
				// }
			],
		}, {}, { nodeValue: 'xyz' }]);
	});
});
