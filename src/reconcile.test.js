import reconcile from './reconcile';
import execute, { frameworks } from './execute';
import { virtualDocument, defaultUpdater } from '.';

jest.mock('./execute');
jest.mock('./observe');

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
				parentElement: container,
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
				parentElement: container,
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
				parentElement: container,
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
			const node = virtualDocument.createElement('div');
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
				parentElement: container,
				toString: expect.anything(),
				nodeValue: 'xyz',
			};

			const view = [, {}, [child]];

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
				parentElement: container,
				appendChild: expect.anything(),
				insertBefore: expect.anything(),
				removeChild: expect.anything(),
				toString: expect.anything(),
				tagName: 'div',
				className: 'abc',
				childNodes: [child],
			};

			child.parentElement = node;
			const view = [node, {}, [child]];

			expect(container.childNodes).toEqual([node]);
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container, node, sibling: { container } });
		});
	});

	describe('update', () => {
		it('updates text node', () => {
			const node = virtualDocument.createTextNode('abc');
			container.appendChild(node);
			const view = [node];
			parentView[2] = view;
			reconcile('xyz', state, parentView, 0, dom);
			expect(container.childNodes).toEqual([node]);
			expect(container.childNodes[0]).toBe(node);
			expect(node.nodeValue).toEqual('xyz');
			expect(parentView).toEqual([{}, {}, view]);
			expect(parentView[2]).toBe(view);
			expect(parentView[2][0]).toBe(node);
			expect(dom).toEqual({ container, node, sibling: { container } });
		});

		it('hydrates dynamic node', () => {
			const node = virtualDocument.createTextNode('abc');
			container.appendChild(node);
			const view = [node];
			parentView[2] = view;
			const callback = () => {};
			reconcile(callback, state, parentView, 0, dom);
			expect(execute).toHaveBeenCalledWith(callback, state, parentView, 0, dom, undefined);
			expect(container.childNodes).toEqual([node]);
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container });
		});

		it('hydrates static node', () => {
			const node = virtualDocument.createElement('div');
			container.appendChild(node);
			const view = [node];
			reconcile(node, state, parentView, 0, dom);
			expect(container.childNodes).toEqual([node]);
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container, node, sibling: { container } });
		});

		it('updates fragment node', () => {
			const child = virtualDocument.createTextNode('abc');
			container.appendChild(child);
			const view = [, {}, [child]];
			parentView[2] = view;
			const template = ['', { key: 'value' }, 'xyz'];
			reconcile(template, state, parentView, 0, dom);
			expect(container.childNodes).toEqual([child]);
			expect(container.childNodes[0]).toBe(child);
			expect(child.nodeValue).toEqual('xyz');
			expect(parentView).toEqual([{}, {}, view]);
			expect(parentView[2]).toBe(view);
			expect(dom).toEqual({ container, node: child, sibling: { container } });
		});

		it('updates element node', () => {
			const child = virtualDocument.createTextNode('abc');
			const node = virtualDocument.createElement('div');
			node.className = 'abc';
			node.appendChild(child);
			container.appendChild(node);
			const view = [node, {}, [child]];
			parentView[2] = view;
			const template = ['div', { className: 'abc' }, 'xyz'];
			reconcile(template, state, parentView, 0, dom);
			expect(container.childNodes).toEqual([node]);
			expect(container.childNodes[0]).toBe(node);
			expect(node.childNodes).toEqual([child]);
			expect(node.childNodes[0]).toBe(child);
			expect(child.nodeValue).toEqual('xyz');
			expect(parentView).toEqual([{}, {}, view]);
			expect(parentView[2]).toBe(view);
			expect(parentView[2][0]).toBe(node);
			expect(dom).toEqual({ container, node, sibling: { container } });
		});
	});

	describe('hydrate', () => {
		it('hydrates text node', () => {
			const node = virtualDocument.createTextNode('abc');
			container.appendChild(node);
			const view = [node];
			const hydrateNodes = [node];
			reconcile('xyz', state, parentView, 0, dom, hydrateNodes);
			expect(container.childNodes).toEqual([node]);
			expect(container.childNodes[0]).toBe(node);
			expect(node.nodeValue).toEqual('xyz');
			expect(parentView).toEqual([{}, {}, view]);
			expect(parentView[2]).toEqual(view);
			expect(parentView[2][0]).toBe(node);
			expect(hydrateNodes).toEqual([]);
			expect(dom).toEqual({ container, node, sibling: { container } });
		});

		it('hydrates dynamic node', () => {
			const node = virtualDocument.createTextNode('abc');
			container.appendChild(node);
			const hydrateNodes = [node];
			const callback = () => {};
			reconcile(callback, state, parentView, 0, dom, hydrateNodes);
			expect(execute).toHaveBeenCalledWith(callback, state, parentView, 0, dom, hydrateNodes);
			expect(container.childNodes).toEqual([node]);
			expect(parentView).toEqual([{}, {}]);
			expect(dom).toEqual({ container });
		});

		it('hydrates static node', () => {
			const node = virtualDocument.createElement('div');
			container.appendChild(node);
			const view = [node];
			const hydrateNodes = [node];
			reconcile(node, state, parentView, 0, dom, hydrateNodes);
			expect(container.childNodes).toEqual([node]);
			expect(parentView).toEqual([{}, {}, view]);
			expect(dom).toEqual({ container, node, sibling: { container } });
		});

		it('hydrates fragment node', () => {
			const child = virtualDocument.createTextNode('abc');
			container.appendChild(child);
			const view = [, {}, [child]];
			const hydrateNodes = [child];
			const template = ['', { key: 'value' }, 'xyz'];
			reconcile(template, state, parentView, 0, dom, hydrateNodes);
			expect(container.childNodes).toEqual([child]);
			expect(container.childNodes[0]).toBe(child);
			expect(child.nodeValue).toEqual('xyz');
			expect(parentView).toEqual([{}, {}, view]);
			expect(parentView[2]).toEqual(view);
			expect(hydrateNodes).toEqual([]);
			expect(dom).toEqual({ container, node: child, sibling: { container } });
		});

		it('hydrates element node', () => {
			const child = virtualDocument.createTextNode('abc');
			const node = virtualDocument.createElement('div');
			node.className = 'abc';
			node.appendChild(child);
			container.appendChild(node);
			const view = [node, {}, [child]];
			const hydrateNodes = [node];
			const template = ['div', { className: 'abc' }, 'xyz'];
			reconcile(template, state, parentView, 0, dom, hydrateNodes);
			expect(container.childNodes).toEqual([node]);
			expect(container.childNodes[0]).toBe(node);
			expect(node.childNodes).toEqual([child]);
			expect(node.childNodes[0]).toBe(child);
			expect(child.nodeValue).toEqual('xyz');
			expect(parentView).toEqual([{}, {}, view]);
			expect(parentView[2]).toEqual(view);
			expect(parentView[2][0]).toBe(node);
			expect(hydrateNodes).toEqual([]);
			expect(dom).toEqual({ container, node, sibling: { container } });
		});
	});
});
