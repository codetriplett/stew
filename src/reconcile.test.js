import reconcile from './reconcile';
import execute, { frameworks } from './execute';
import observe from './observe';
import { virtualDocument, defaultUpdater } from '.';

jest.mock('./execute');
jest.mock('./observe');

// TODO: test hydration with childNodes param
// - containerRef needs to remain as the fragment ref so it can set its keyed and indexed children properly
// - childNodes works as a reference for parent element node for fragments and allows hydrate and create to work the same, apart from not having childNodes available
describe('reconcile', () => {
	let container, state, parentView, dom, hydrateNodes, framework;

	beforeEach(() => {
		container = virtualDocument.createElement('div');
		state = {};
		parentView = [{}, {}];
		dom = { container };
		hydrateNodes = [];
		framework = [virtualDocument, defaultUpdater];
		frameworks.splice(0);
		frameworks.unshift(framework);
	});

	describe('create', () => {
		it('creates null', () => {
			reconcile(null, state, parentView, 0, dom);
			const view = [];
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container });
		});

		it('creates undefined', () => {
			reconcile(undefined, state, parentView, 0, dom);
			const view = [];
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container });
		});

		it('creates false', () => {
			reconcile(false, state, parentView, 0, dom);
			const view = [];
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container });
		});

		it('creates true', () => {
			reconcile(true, state, parentView, 0, dom);
			const view = [];
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container });
		});

		it('creates zero', () => {
			reconcile(0, state, parentView, 0, dom);

			const node = {
				toString: expect.anything(),
				nodeValue: '0',
			};

			const view = [node];
			expect(container.childNodes).toEqual([node]);
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container, node, sibling: { container } });
		});

		it('creates number', () => {
			reconcile(123, state, parentView, 0, dom);

			const node = {
				toString: expect.anything(),
				nodeValue: '123',
			};

			const view = [node];
			expect(container.childNodes).toEqual([node]);
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container, node, sibling: { container } });
		});

		it('creates text node', () => {
			reconcile('abc', state, parentView, 0, dom);

			const node = {
				toString: expect.anything(),
				nodeValue: 'abc',
			};

			const view = [node];
			expect(container.childNodes).toEqual([node]);
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container, node, sibling: { container } });
		});

		it('creates dynamic node', () => {
			const callback = () => {};
			reconcile(callback, state, parentView, 0, dom);
			expect(execute).toHaveBeenCalledWith(callback, state, parentView, 0, dom, undefined);
			expect(container.childNodes).toEqual([]);
			expect(parentView).toEqual([{}, {}]);
			expect(dom).toEqual({ container });
		});

		it('creates static node', () => {
			const node = document.createElement('div');
			reconcile(node, state, parentView, 0, dom);
			const view = [node];
			expect(container.childNodes).toEqual([node]);
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container, node, sibling: { container } });
		});

		it('creates fragment node', () => {
			const template = ['', { key: 'value' }, 'xyz'];
			reconcile(template, state, parentView, 0, dom);
			
			const child = {
				toString: expect.anything(),
				nodeValue: 'xyz',
			};

			const view = [child, {}, [child]];

			expect(container.childNodes).toEqual([child]);
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container, node: child, sibling: { container } });
		});

		it('creates element node', () => {
			const template = ['div', { className: 'abc' }, 'xyz'];
			reconcile(template, state, parentView, 0, dom);
			
			const child = {
				toString: expect.anything(),
				nodeValue: 'xyz',
			};

			const node = {
				appendChild: expect.anything(),
				insertBefore: expect.anything(),
				toString: expect.anything(),
				tagName: 'div',
				className: 'abc',
				childNodes: [child],
			};

			const view = [node, {}, [child]];

			expect(container.childNodes).toEqual([node]);
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container, node, sibling: { container } });
		});
	});

	// describe('update', () => {
	// 	it('updates text node', () => {
	// 		const node = containerRef[2] = document.createTextNode('abc');
	// 		container.appendChild(node);
	// 		const actual = reconcile('xyz', state, containerRef, 0, prevRefs, container, sibling);
	// 		expect(container.childNodes).toEqual([node]);
	// 		expect(containerRef).toEqual([container, {}, node]);
	// 		expect(actual).toEqual({ node, next: sibling });
	// 		expect(actual.node).toBe(node);
	// 		expect(actual.node.nodeValue).toEqual('xyz');
	// 	});

	// 	it('updates dynamic node', () => {
	// 		const node = containerRef[2] = document.createTextNode('abc');
	// 		container.appendChild(node);
	// 		execute.mockReturnValue({ node, next: sibling });
	// 		const callback = () => {};
	// 		const actual = reconcile(callback, state, containerRef, 0, prevRefs, container, sibling);
	// 		expect(container.childNodes).toEqual([node]);
	// 		expect(containerRef).toEqual([container, {}, node]);
	// 		expect(execute).toHaveBeenCalledWith(callback, state, containerRef, 0, prevRefs, container, sibling);
	// 		expect(actual).toEqual({ node, next: sibling });
	// 		expect(actual.node).toBe(node);
	// 	});

	// 	it('updates static node', () => {
	// 		const node = containerRef[2] = document.createElement('div');
	// 		const actual = reconcile(node, state, containerRef, 0, prevRefs, container, sibling);
	// 		expect(container.childNodes).toEqual([node]);
	// 		expect(containerRef).toEqual([container, {}, node]);
	// 		expect(actual).toEqual({ node, next: sibling });
	// 		expect(actual.node).toBe(node);
	// 	});

	// 	it('updates fragment node', () => {
	// 		const node = document.createTextNode('abc');
	// 		container.appendChild(node);
	// 		containerRef[2] = [{}, {}, node];
	// 		const object = { key: 'value' };
	// 		const template = ['', object, 'xyz'];
	// 		const actual = reconcile(template, state, containerRef, 0, prevRefs, container, sibling);

	// 		const ref = [{
	// 			state: object,
	// 		}, {}, node];

	// 		expect(container.childNodes).toEqual([node]);
	// 		expect(containerRef).toEqual([container, {}, ref]);
	// 		expect(observe).toHaveBeenCalledWith(object);
	// 		expect(actual).toEqual({ node, next: sibling });
	// 		expect(actual.node).toBe(node);
	// 	});

	// 	it('updates element node', () => {
	// 		const node = document.createElement('div');
	// 		node.className = 'abc';
	// 		const child = document.createTextNode('abc');
	// 		node.appendChild(child);
	// 		container.appendChild(node);
	// 		const ref = containerRef[2] = [node, { className: 'abc' }, child];
	// 		const template = ['div', { className: 'xyz' }, 'xyz'];
	// 		const actual = reconcile(template, state, containerRef, 0, prevRefs, container, sibling);
	// 		expect(container.childNodes).toEqual([node]);
	// 		expect(containerRef).toEqual([container, {}, ref]);
	// 		expect(actual).toEqual({ node, next: sibling });
	// 		expect(actual.node).toBe(node);
	// 		expect(actual.node.className).toEqual('xyz');
	// 	});
	// });

	// describe('hydrate', () => {
	// 	it('hydrates text node', () => {
	// 		const node = document.createTextNode('abc');
	// 		container.appendChild(node);
	// 		prevRefs = [node];
	// 		const actual = reconcile('xyz', state, containerRef, 0, prevRefs, container, sibling);
	// 		expect(container.childNodes).toEqual([node]);
	// 		expect(containerRef).toEqual([container, {}, node]);
	// 		expect(actual).toEqual({ node, next: sibling });
	// 		expect(actual.node).toBe(node);
	// 		expect(actual.node.nodeValue).toEqual('xyz');
	// 	});

	// 	it('hydrates dynamic node', () => {
	// 		const node = document.createTextNode('abc');
	// 		container.appendChild(node);
	// 		prevRefs = [node];
	// 		execute.mockReturnValue({ node, next: sibling });
	// 		const callback = () => {};
	// 		const actual = reconcile(callback, state, containerRef, 0, prevRefs, container, sibling);
	// 		expect(container.childNodes).toEqual([node]);
	// 		expect(containerRef).toEqual([container, {}]);
	// 		expect(execute).toHaveBeenCalledWith(callback, state, containerRef, 0, prevRefs, container, sibling);
	// 		expect(actual).toEqual({ node, next: sibling });
	// 		expect(actual.node).toBe(node);
	// 	});

	// 	it('hydrates static node', () => {
	// 		const node = document.createElement('div');
	// 		prevRefs = [node];
	// 		const actual = reconcile(node, state, containerRef, 0, prevRefs, container, sibling);
	// 		expect(container.childNodes).toEqual([node]);
	// 		expect(containerRef).toEqual([container, {}, node]);
	// 		expect(actual).toEqual({ node, next: sibling });
	// 		expect(actual.node).toBe(node);
	// 	});

	// 	it('hydrates fragment node', () => {
	// 		const node = document.createTextNode('abc');
	// 		container.appendChild(node);
	// 		prevRefs = [node];
	// 		const object = { key: 'value' };
	// 		const template = ['', object, 'xyz'];
	// 		const actual = reconcile(template, state, containerRef, 0, prevRefs, container, sibling);

	// 		const ref = [{
	// 			state: object,
	// 		}, {}, node];

	// 		expect(container.childNodes).toEqual([node]);
	// 		expect(containerRef).toEqual([container, {}, ref]);
	// 		expect(observe).toHaveBeenCalledWith(object);
	// 		expect(actual).toEqual({ node, next: sibling });
	// 		expect(actual.node).toBe(node);
	// 	});

	// 	it('hydrates element node', () => {
	// 		const node = document.createElement('div');
	// 		node.className = 'abc';
	// 		const child = document.createTextNode('abc');
	// 		node.appendChild(child);
	// 		container.appendChild(node);
	// 		prevRefs = [node];
	// 		const ref = [node, {}, child];
	// 		const template = ['div', { className: 'xyz' }, 'xyz'];
	// 		const actual = reconcile(template, state, containerRef, 0, prevRefs, container, sibling);
	// 		expect(container.childNodes).toEqual([node]);
	// 		expect(containerRef).toEqual([container, {}, ref]);
	// 		expect(actual).toEqual({ node, next: sibling });
	// 		expect(actual.node).toBe(node);
	// 		expect(actual.node.className).toEqual('xyz');
	// 	});
	// });
});
