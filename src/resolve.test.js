import resolve from './resolve';
import execute, { documents } from './execute';
import observe from './observe';

jest.mock('./execute');
jest.mock('./observe');

describe('resolve', () => {
	let document, state, parentElement, srcRef;

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
		documents.splice(0);
		documents.unshift(document);

		jest.clearAllMocks();
		execute.mockReturnValue({ nodeValue: 'xyz' });
		observe.mockReturnValue({ key: 'value' });
	});

	describe('create', () => {
		beforeEach(() => {
			srcRef = [, {}];
		});

		it('resolves null', () => {
			const actual = resolve(null, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([]);
			expect(srcRef).toEqual([, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('resolves undefined', () => {
			const actual = resolve(undefined, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([]);
			expect(srcRef).toEqual([, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('resolves false', () => {
			const actual = resolve(false, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([]);
			expect(srcRef).toEqual([, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('resolves true', () => {
			const actual = resolve(true, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([]);
			expect(srcRef).toEqual([, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('resolves zero', () => {
			const actual = resolve(0, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(srcRef).toEqual([, {}, actual]);
			expect(actual).toEqual({ nodeValue: '0' });
		});

		it('resolves number', () => {
			const actual = resolve(123, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(srcRef).toEqual([, {}, actual]);
			expect(actual).toEqual({ nodeValue: '123' });
		});

		it('resolves text node', () => {
			const actual = resolve('abc', state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(srcRef).toEqual([, {}, actual]);
			expect(actual).toEqual({ nodeValue: 'abc' });
		});

		it('resolves dynamic node', () => {
			const callback = () => {};
			const actual = resolve(callback, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(srcRef).toEqual([, {}, actual]);
			expect(execute).toHaveBeenCalledWith(callback, state, srcRef, 0, parentElement, undefined);
			expect(actual).toEqual({ nodeValue: 'xyz' });
		});

		it('resolves static node', () => {
			const node = { tagName: 'div' };
			const actual = resolve(node, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(srcRef).toEqual([, {}, actual]);
			expect(actual).toBe(node);
		});

		it.only('resolves fragment node', () => {
			const object = { key: 'value' };
			const template = ['', object, 'xyz'];
			const actual = resolve(template, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([{ nodeValue: 'xyz' }]);
			expect(srcRef).toEqual([, {}, actual]);
			expect(observe).toHaveBeenCalledWith(object);
			expect(actual).toEqual([{ state: object }, {}, { nodeValue: 'xyz' }]);
		});

		it('resolves element node', () => {
			const template = ['div', { className: 'abc' }, 'xyz'];
			const actual = resolve(template, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([actual[0]]);
			expect(srcRef).toEqual([, {}, actual]);

			expect(actual).toEqual([{
				appendChild: expect.anything(),
				insertBefore: expect.anything(),
				tagName: 'div',
				className: 'abc',
				childNodes: [
					{ nodeValue: 'xyz' }
				],
			}, {}, { nodeValue: 'xyz' }]);
		});
	});

	describe.skip('update', () => {
		beforeEach(() => {
			srcRef = [parentElement, {}];
		});

		it('resolves null', () => {
			const actual = resolve(null, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([]);
			expect(srcRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('resolves undefined', () => {
			const actual = resolve(undefined, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([]);
			expect(srcRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('resolves false', () => {
			const actual = resolve(false, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([]);
			expect(srcRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('resolves true', () => {
			const actual = resolve(true, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([]);
			expect(srcRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('resolves zero', () => {
			const actual = resolve(0, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(srcRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual({ nodeValue: '0' });
		});

		it('resolves number', () => {
			const actual = resolve(123, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(srcRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual({ nodeValue: '123' });
		});

		it('resolves text node', () => {
			const actual = resolve('abc', state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(srcRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual({ nodeValue: 'abc' });
		});

		it('resolves dynamic node', () => {
			const callback = () => {};
			const actual = resolve(callback, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(srcRef).toEqual([parentElement, {}, actual]);
			expect(execute).toHaveBeenCalledWith(callback, state, srcRef, 0, parentElement, undefined);
			expect(actual).toEqual({ nodeValue: 'xyz' });
		});

		it('resolves static node', () => {
			const node = { tagName: 'div' };
			const actual = resolve(node, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(srcRef).toEqual([parentElement, {}, actual]);
			expect(actual).toBe(node);
		});

		it('resolves fragment node', () => {
			const object = { key: 'value' };
			const template = ['', object, 'xyz'];
			const actual = resolve(template, state, srcRef, 0, parentElement);
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
			const actual = resolve(template, state, srcRef, 0, parentElement);
			expect(parentElement.childNodes).toEqual([actual[0]]);
			expect(srcRef).toEqual([parentElement, {}, actual]);

			expect(actual).toEqual([{
				appendChild: expect.anything(),
				insertBefore: expect.anything(),
				tagName: 'div',
				className: 'abc',
				childNodes: [
					{ nodeValue: 'xyz' }
				],
			}, {}, { nodeValue: 'xyz' }]);
		});
	});
});
