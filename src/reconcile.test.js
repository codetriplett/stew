import reconcile from './reconcile';
import execute, { documents } from './execute';
import observe from './observe';
import { defaultDocument } from '.';

jest.mock('./execute');
jest.mock('./observe');

// TODO: test hydration with childNodes param
// - containerRef needs to remain as the fragment ref so it can set its keyed and indexed children properly
// - childNodes works as a reference for parent element node for fragments and allows hydrate and create to work the same, apart from not having childNodes available
describe('reconcile', () => {
	let document, state, parentElement, childNodes, containerRef, oldKeyedRefs;

	beforeEach(() => {
		document = defaultDocument;
		documents.splice(0);
		documents.unshift(document);
		state = {};
		parentElement = document.createElement('div');
		childNodes = [];
		containerRef = [parentElement, {}];
		oldKeyedRefs = {};

		jest.clearAllMocks();
		execute.mockReturnValue(document.createTextNode('lmno'));
		observe.mockReturnValue({ key: 'value' });
	});

	describe('create', () => {
		it('creates null', () => {
			const actual = reconcile(null, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('creates undefined', () => {
			const actual = reconcile(undefined, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('creates false', () => {
			const actual = reconcile(false, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('creates true', () => {
			const actual = reconcile(true, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('creates zero', () => {
			const actual = reconcile(0, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);

			expect(actual).toEqual({
				toString: expect.anything(),
				nodeValue: '0',
			});
		});

		it('creates number', () => {
			const actual = reconcile(123, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);

			expect(actual).toEqual({
				toString: expect.anything(),
				nodeValue: '123',
			});
		});

		it('creates text node', () => {
			const actual = reconcile('abc', state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);

			expect(actual).toEqual({
				toString: expect.anything(),
				nodeValue: 'abc',
			});
		});

		it('creates dynamic node', () => {
			const callback = () => {};
			const actual = reconcile(callback, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(execute).toHaveBeenCalledWith(callback, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			
			expect(actual).toEqual({
				toString: expect.anything(),
				nodeValue: 'lmno',
			});
		});

		it('creates static node', () => {
			const node = document.createElement('div');
			const actual = reconcile(node, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toBe(node);
		});

		it('creates fragment node', () => {
			const object = { key: 'value' };
			const template = ['', object, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			
			const child = {
				toString: expect.anything(),
				nodeValue: 'xyz'
			}
			
			expect(parentElement.childNodes).toEqual([child]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(observe).toHaveBeenCalledWith(object);

			expect(actual).toEqual([{ state: object }, {}, child]);
		});

		it('creates element node', () => {
			const template = ['div', { className: 'abc' }, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual[0]]);
			expect(containerRef).toEqual([parentElement, {}, actual]);

			const child = {
				toString: expect.anything(),
				nodeValue: 'xyz',
			};

			expect(actual).toEqual([{
				appendChild: expect.anything(),
				insertBefore: expect.anything(),
				toString: expect.anything(),
				tagName: 'div',
				className: 'abc',
				childNodes: [child],
			}, {}, child]);
		});
	});

	describe('update', () => {
		it('updates number', () => {
			const node = containerRef[2] = document.createTextNode('123');
			const actual = reconcile(789, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);

			const child = {
				toString: expect.anything(),
				nodeValue: '789',
			};

			expect(actual).toEqual(child);
			expect(actual).toBe(node);
		});

		it('updates text node', () => {
			const node = containerRef[2] = document.createTextNode('abc');
			const actual = reconcile('xyz', state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);

			const child = {
				toString: expect.anything(),
				nodeValue: 'xyz',
			};

			expect(actual).toEqual(child);
			expect(actual).toBe(node);
		});

		it('updates dynamic node', () => {
			const node = containerRef[2] = document.createTextNode('abc');
			execute.mockReturnValue(node);
			const callback = () => {};
			const actual = reconcile(callback, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(execute).toHaveBeenCalledWith(callback, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);

			const child = {
				toString: expect.anything(),
				nodeValue: 'abc',
			};

			expect(actual).toEqual(child);
			expect(actual).toBe(node);
		});

		it('updates static node', () => {
			const node = containerRef[2] = document.createElement('div');
			const actual = reconcile(node, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toBe(node);
		});

		it('updates fragment node', () => {
			const object = { key: 'value' };
			const template = ['', object, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			
			const child = {
				toString: expect.anything(),
				nodeValue: 'xyz',
			};
			
			expect(parentElement.childNodes).toEqual([child]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(observe).toHaveBeenCalledWith(object);

			expect(actual).toEqual([{
				state: object
			}, {}, child]);
		});

		it('updates element node', () => {
			const template = ['div', { className: 'abc' }, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual[0]]);
			expect(containerRef).toEqual([parentElement, {}, actual]);

			const child = {
				toString: expect.anything(),
				nodeValue: 'xyz',
			};

			expect(actual).toEqual([{
				appendChild: expect.anything(),
				insertBefore: expect.anything(),
				toString: expect.anything(),
				tagName: 'div',
				className: 'abc',
				childNodes: [child],
			}, {}, child]);
		});
	});

	describe('hydrate', () => {
		it('hydrates number', () => {
			const node = childNodes[0] = document.createTextNode('123');
			const actual = reconcile(123, state, containerRef, 0, parentElement, childNodes);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);

			const child = {
				toString: expect.anything(),
				nodeValue: '123',
			};

			expect(actual).toEqual(child);
			expect(actual).toBe(node);
		});

		it('hydrates text node', () => {
			const node = childNodes[0] = document.createTextNode('abc');
			const actual = reconcile('abc', state, containerRef, 0, parentElement, childNodes);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);

			const child = {
				toString: expect.anything(),
				nodeValue: 'abc',
			};

			expect(actual).toEqual(child);
			expect(actual).toBe(node);
		});

		it('hydrates dynamic node', () => {
			const node = childNodes[0] = document.createTextNode('abc');
			execute.mockReturnValue(node);
			const callback = () => {};
			const actual = reconcile(callback, state, containerRef, 0, parentElement, childNodes);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(execute).toHaveBeenCalledWith(callback, state, containerRef, 0, parentElement, childNodes, undefined);

			const child = {
				toString: expect.anything(),
				nodeValue: 'abc',
			};

			expect(actual).toEqual(child);
			expect(actual).toBe(node);
		});

		it('hydrates static node', () => {
			const node = childNodes[0] = document.createElement('div');
			const actual = reconcile(node, state, containerRef, 0, parentElement, childNodes);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toBe(node);
		});

		it('hydrates fragment node', () => {
			const node = childNodes[0] = document.createTextNode('abc');
			const object = { key: 'value' };
			const template = ['', object, 'abc'];
			const actual = reconcile(template, state, containerRef, 0, parentElement, childNodes);
			
			const child = {
				toString: expect.anything(),
				nodeValue: 'abc',
			};
			
			expect(parentElement.childNodes).toEqual([child]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(observe).toHaveBeenCalledWith(object);

			expect(actual).toEqual([{
				state: object
			}, {}, child]);

			expect(actual[2]).toBe(node);
		});

		it('hydrates element node', () => {
			const node = childNodes[0] = document.createElement('div');
			const template = ['div', { className: 'abc' }, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, parentElement, childNodes);
			expect(parentElement.childNodes).toEqual([actual[0]]);
			expect(containerRef).toEqual([parentElement, {}, actual]);

			const child = {
				toString: expect.anything(),
				nodeValue: 'xyz',
			};

			expect(actual).toEqual([{
				appendChild: expect.anything(),
				insertBefore: expect.anything(),
				toString: expect.anything(),
				tagName: 'div',
				className: 'abc',
				childNodes: [child],
			}, {}, child]);

			expect(actual[0]).toBe(node);
		});
	});
});
