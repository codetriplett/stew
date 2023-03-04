import reconcile from './reconcile';
import execute, { documents } from './execute';
import observe from './observe';

jest.mock('./execute');
jest.mock('./observe');

// TODO: test hydration with childNodes param
// - containerRef needs to remain as the fragment ref so it can set its keyed and indexed children properly
// - childNodes works as a reference for parent element node for fragments and allows hydrate and create to work the same, apart from not having childNodes available
describe('reconcile', () => {
	let document, state, parentElement, childNodes, containerRef, oldKeyedRefs;

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
		childNodes = [];
		containerRef = [parentElement, {}];
		oldKeyedRefs = {};
		documents.splice(0);
		documents.unshift(document);

		jest.clearAllMocks();
		execute.mockReturnValue({ nodeValue: 'xyz' });
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
			expect(actual).toEqual({ nodeValue: '0' });
		});

		it('creates number', () => {
			const actual = reconcile(123, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual({ nodeValue: '123' });
		});

		it('creates text node', () => {
			const actual = reconcile('abc', state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual({ nodeValue: 'abc' });
		});

		it('creates dynamic node', () => {
			const callback = () => {};
			const actual = reconcile(callback, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(execute).toHaveBeenCalledWith(callback, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(actual).toEqual({ nodeValue: 'xyz' });
		});

		it('creates static node', () => {
			const node = { tagName: 'div' };
			const actual = reconcile(node, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toBe(node);
		});

		it('creates fragment node', () => {
			const object = { key: 'value' };
			const template = ['', object, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([{ nodeValue: 'xyz' }]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(observe).toHaveBeenCalledWith(object);
			expect(actual).toEqual([{ state: object }, {}, { nodeValue: 'xyz' }]);
		});

		it('creates element node', () => {
			const template = ['div', { className: 'abc' }, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual[0]]);
			expect(containerRef).toEqual([parentElement, {}, actual]);

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
		it('updates null', () => {
			const actual = reconcile(null, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('updates undefined', () => {
			const actual = reconcile(undefined, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('updates false', () => {
			const actual = reconcile(false, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('updates true', () => {
			const actual = reconcile(true, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual(undefined);
		});

		it('updates zero', () => {
			const actual = reconcile(0, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual({ nodeValue: '0' });
		});

		it('updates number', () => {
			const actual = reconcile(123, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual({ nodeValue: '123' });
		});

		it('updates text node', () => {
			const actual = reconcile('abc', state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toEqual({ nodeValue: 'abc' });
		});

		it('updates dynamic node', () => {
			const callback = () => {};
			const actual = reconcile(callback, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(execute).toHaveBeenCalledWith(callback, state, containerRef, oldKeyedRefs, 0, parentElement, undefined);
			expect(actual).toEqual({ nodeValue: 'xyz' });
		});

		it('updates static node', () => {
			const node = { tagName: 'div' };
			const actual = reconcile(node, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(actual).toBe(node);
		});

		it('updates fragment node', () => {
			const object = { key: 'value' };
			const template = ['', object, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([{ nodeValue: 'xyz' }]);
			expect(containerRef).toEqual([parentElement, {}, actual]);
			expect(observe).toHaveBeenCalledWith(object);

			expect(actual).toEqual([{
				...ctx,
				state: object
			}, {}, { nodeValue: 'xyz' }]);
		});

		it('updates element node', () => {
			const template = ['div', { className: 'abc' }, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, parentElement, childNodes, oldKeyedRefs);
			expect(parentElement.childNodes).toEqual([actual[0]]);
			expect(containerRef).toEqual([parentElement, {}, actual]);

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
