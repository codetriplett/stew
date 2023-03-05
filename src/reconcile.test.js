import reconcile from './reconcile';
import execute, { documents, updaters } from './execute';
import observe from './observe';
import { virtualDocument, defaultUpdater } from '.';

jest.mock('./execute');
jest.mock('./observe');

// TODO: test hydration with childNodes param
// - containerRef needs to remain as the fragment ref so it can set its keyed and indexed children properly
// - childNodes works as a reference for parent element node for fragments and allows hydrate and create to work the same, apart from not having childNodes available
describe('reconcile', () => {
	let document, state, container, childNodes, containerRef, prevRefs, sibling;

	beforeEach(() => {
		document = virtualDocument;
		documents.splice(0);
		documents.unshift(document);
		updaters.splice(0);
		updaters.unshift(defaultUpdater);
		state = {};
		container = document.createElement('div');
		childNodes = [];
		containerRef = [container, {}];
		prevRefs = {};
		sibling = {};

		jest.clearAllMocks();
		execute.mockReturnValue({ node: document.createTextNode('lmno'), next: sibling });
		observe.mockReturnValue({ key: 'value' });
	});

	describe('create', () => {
		it('creates null', () => {
			const actual = reconcile(null, state, containerRef, 0, {}, container, sibling);
			expect(container.childNodes).toEqual([]);
			expect(containerRef).toEqual([container, {}, undefined]);
			expect(actual).toBe(sibling);
		});

		it('creates undefined', () => {
			const actual = reconcile(undefined, state, containerRef, 0, {}, container, sibling);
			expect(container.childNodes).toEqual([]);
			expect(containerRef).toEqual([container, {}, undefined]);
			expect(actual).toEqual(sibling);
		});

		it('creates false', () => {
			const actual = reconcile(false, state, containerRef, 0, {}, container, sibling);
			expect(container.childNodes).toEqual([]);
			expect(containerRef).toEqual([container, {}, undefined]);
			expect(actual).toEqual(sibling);
		});

		it('creates true', () => {
			const actual = reconcile(true, state, containerRef, 0, {}, container, sibling);
			expect(container.childNodes).toEqual([]);
			expect(containerRef).toEqual([container, {}, undefined]);
			expect(actual).toEqual(sibling);
		});

		it('creates zero', () => {
			const actual = reconcile(0, state, containerRef, 0, {}, container, sibling);

			const node = {
				toString: expect.anything(),
				nodeValue: '0',
			};

			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, node]);
			expect(actual).toEqual({ node, next: sibling });
		});

		it('creates number', () => {
			const actual = reconcile(123, state, containerRef, 0, {}, container, sibling);

			const node = {
				toString: expect.anything(),
				nodeValue: '123',
			};

			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, node]);
			expect(actual).toEqual({ node, next: sibling });
		});

		it('creates text node', () => {
			const actual = reconcile('abc', state, containerRef, 0, {}, container, sibling);

			const node = {
				toString: expect.anything(),
				nodeValue: 'abc',
			};

			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, node]);
			expect(actual).toEqual({ node, next: sibling });
		});

		it('creates dynamic node', () => {
			const callback = () => {};
			const actual = reconcile(callback, state, containerRef, 0, {}, container, sibling);

			const node = {
				toString: expect.anything(),
				nodeValue: 'lmno',
			};

			expect(container.childNodes).toEqual([]);
			expect(containerRef).toEqual([container, {}]);
			expect(execute).toHaveBeenCalledWith(callback, state, containerRef, 0, {}, container, sibling);
			expect(actual).toEqual({ node, next: sibling });
		});

		it('creates static node', () => {
			const node = document.createElement('div');
			const actual = reconcile(node, state, containerRef, 0, {}, container, sibling);
			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, node]);
			expect(actual).toEqual({ node, next: sibling });
			expect(actual.node).toBe(node);
		});

		it('creates fragment node', () => {
			const object = { key: 'value' };
			const template = ['', object, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, {}, container, sibling);
			
			const node = {
				toString: expect.anything(),
				nodeValue: 'xyz',
			};

			expect(container.childNodes).toEqual([node]);

			expect(containerRef).toEqual([container, {}, [{
				state: object,
			}, {}, node]]);

			expect(observe).toHaveBeenCalledWith(object);
			expect(actual).toEqual({ node, next: sibling });
		});

		it('creates element node', () => {
			const template = ['div', { className: 'abc' }, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, {}, container, sibling);

			const child = {
				toString: expect.anything(),
				nodeValue: 'xyz'
			};

			const node = {
				appendChild: expect.anything(),
				insertBefore: expect.anything(),
				toString: expect.anything(),
				tagName: 'div',
				className: 'abc',
				childNodes: [child],
			};

			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, [node, {}, child]]);
			expect(actual).toEqual({ node, next: sibling });
		});
	});

	describe('update', () => {
		it('updates text node', () => {
			const node = containerRef[2] = document.createTextNode('abc');
			container.appendChild(node);
			const actual = reconcile('xyz', state, containerRef, 0, prevRefs, container, sibling);
			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, node]);
			expect(actual).toEqual({ node, next: sibling });
			expect(actual.node).toBe(node);
			expect(actual.node.nodeValue).toEqual('xyz');
		});

		it('updates dynamic node', () => {
			const node = containerRef[2] = document.createTextNode('abc');
			container.appendChild(node);
			execute.mockReturnValue({ node, next: sibling });
			const callback = () => {};
			const actual = reconcile(callback, state, containerRef, 0, prevRefs, container, sibling);
			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, node]);
			expect(execute).toHaveBeenCalledWith(callback, state, containerRef, 0, prevRefs, container, sibling);
			expect(actual).toEqual({ node, next: sibling });
			expect(actual.node).toBe(node);
		});

		it('updates static node', () => {
			const node = containerRef[2] = document.createElement('div');
			const actual = reconcile(node, state, containerRef, 0, prevRefs, container, sibling);
			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, node]);
			expect(actual).toEqual({ node, next: sibling });
			expect(actual.node).toBe(node);
		});

		it('updates fragment node', () => {
			const node = document.createTextNode('abc');
			container.appendChild(node);
			containerRef[2] = [{}, {}, node];
			const object = { key: 'value' };
			const template = ['', object, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, prevRefs, container, sibling);

			const ref = [{
				state: object,
			}, {}, node];

			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, ref]);
			expect(observe).toHaveBeenCalledWith(object);
			expect(actual).toEqual({ node, next: sibling });
			expect(actual.node).toBe(node);
		});

		it('updates element node', () => {
			const node = document.createElement('div');
			node.className = 'abc';
			const child = document.createTextNode('abc');
			node.appendChild(child);
			container.appendChild(node);
			const ref = containerRef[2] = [node, { className: 'abc' }, child];
			const template = ['div', { className: 'xyz' }, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, prevRefs, container, sibling);
			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, ref]);
			expect(actual).toEqual({ node, next: sibling });
			expect(actual.node).toBe(node);
			expect(actual.node.className).toEqual('xyz');
		});
	});

	describe('hydrate', () => {
		it('hydrates text node', () => {
			const node = document.createTextNode('abc');
			container.appendChild(node);
			prevRefs = [node];
			const actual = reconcile('xyz', state, containerRef, 0, prevRefs, container, sibling);
			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, node]);
			expect(actual).toEqual({ node, next: sibling });
			expect(actual.node).toBe(node);
			expect(actual.node.nodeValue).toEqual('xyz');
		});

		it('hydrates dynamic node', () => {
			const node = document.createTextNode('abc');
			container.appendChild(node);
			prevRefs = [node];
			execute.mockReturnValue({ node, next: sibling });
			const callback = () => {};
			const actual = reconcile(callback, state, containerRef, 0, prevRefs, container, sibling);
			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}]);
			expect(execute).toHaveBeenCalledWith(callback, state, containerRef, 0, prevRefs, container, sibling);
			expect(actual).toEqual({ node, next: sibling });
			expect(actual.node).toBe(node);
		});

		it('hydrates static node', () => {
			const node = document.createElement('div');
			prevRefs = [node];
			const actual = reconcile(node, state, containerRef, 0, prevRefs, container, sibling);
			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, node]);
			expect(actual).toEqual({ node, next: sibling });
			expect(actual.node).toBe(node);
		});

		it('hydrates fragment node', () => {
			const node = document.createTextNode('abc');
			container.appendChild(node);
			prevRefs = [node];
			const object = { key: 'value' };
			const template = ['', object, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, prevRefs, container, sibling);

			const ref = [{
				state: object,
			}, {}, node];

			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, ref]);
			expect(observe).toHaveBeenCalledWith(object);
			expect(actual).toEqual({ node, next: sibling });
			expect(actual.node).toBe(node);
		});

		it('hydrates element node', () => {
			const node = document.createElement('div');
			node.className = 'abc';
			const child = document.createTextNode('abc');
			node.appendChild(child);
			container.appendChild(node);
			prevRefs = [node];
			const ref = [node, {}, child];
			const template = ['div', { className: 'xyz' }, 'xyz'];
			const actual = reconcile(template, state, containerRef, 0, prevRefs, container, sibling);
			expect(container.childNodes).toEqual([node]);
			expect(containerRef).toEqual([container, {}, ref]);
			expect(actual).toEqual({ node, next: sibling });
			expect(actual.node).toBe(node);
			expect(actual.node.className).toEqual('xyz');
		});
	});
});
