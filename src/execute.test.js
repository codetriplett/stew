import execute, { contexts, documents, callbacks } from './execute';
import reconcile from './reconcile';
import { defaultDocument } from '.';

jest.mock('./reconcile');

describe('execute', () => {
	const parentCallback = jest.fn();
	let document, callback, state, containerRef, i, container, childNodes, oldKeyedRefs, ref, item, context;

	beforeEach(() => {
		document = defaultDocument;
		documents.splice(0);
		documents.unshift(document);
		callback = jest.fn();
		state = {};
		container = defaultDocument.createElement('div');
		childNodes = [];
		containerRef = [container, {}];
		i = 0;
		oldKeyedRefs = {};
		ref = [{}, {}];
		item = 'lmno';
		context = { parentCallback, document, ref: [, {}], teardowns: [], params: [state, containerRef, i, container, childNodes, oldKeyedRefs] };

		contexts.set(callback, context);
		documents.splice(0);
		callbacks.splice(0);
		callbacks.unshift(parentCallback);
		
		jest.clearAllMocks();
		reconcile.mockReturnValue(ref);
		callback.mockReturnValue(item);
	});

	it.only('executes the first time', () => {
		contexts.set(callback, undefined);
		let documentStack, callbackStack;

		callback.mockImplementation(() => {
			documentStack = [...documents];
			callbackStack = [...callbacks];
			return item;
		});

		const containerRef = [{}, {}];
		const actual = execute(callback, state, containerRef, 0, container, childNodes, oldKeyedRefs);
		
		expect(callback).toHaveBeenCalledWith(state, [, {}]);
		expect(reconcile).toHaveBeenCalledWith(item, state, containerRef, 0, container, childNodes, oldKeyedRefs);

		expect(contexts.get(callback)).toEqual(context);
		expect(callbacks).toEqual([parentCallback]);
		expect(documents).toEqual([]);
		expect(actual).toEqual(ref);
	});

	it('executes a second time', () => {
		const parentCallback = jest.fn();
		stack.unshift(parentCallback);
		const containerRef = [{}, {}, [node, {}]];
		const actual = execute(callback, { document, state }, containerRef, 0);
		const context = { document, state, parentCallback, ref: [node, {}], i: 0, teardowns: [] };
		
		expect(callback).toHaveBeenCalledWith(state, [node, {}]);
		expect(reconcile).toHaveBeenCalledWith(template, context, [node, {}], 0);

		expect(contexts.get(callback)).toEqual(context);
		expect(stack).toEqual([parentCallback]);
		expect(actual).toEqual(node);
	});

	it('executes a reaction', () => {
		const actual = execute(callback);
		const context = { document, state, ref: [node, {}], i: 0, teardowns: [] };

		expect(callback).toHaveBeenCalledWith(state, [node, {}]);
		expect(reconcile).toHaveBeenCalledWith(template, context, [node, {}], 0);

		expect(stack).toEqual([]);
		expect(actual).toEqual(node);
	});
});
