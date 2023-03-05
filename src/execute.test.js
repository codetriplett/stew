import execute, { contexts, documents, callbacks } from './execute';
import reconcile from './reconcile';
import { defaultDocument } from '.';

jest.mock('./reconcile');

describe('execute', () => {
	const parentCallback = jest.fn();
	let customDocument, callback, state, containerRef, i, container, childNodes, oldKeyedRefs, ref, item, context;

	beforeEach(() => {
		customDocument = defaultDocument;
		documents.splice(0);
		documents.unshift(customDocument);
		callback = jest.fn();
		state = {};
		container = defaultDocument.createElement('div');
		childNodes = [];
		containerRef = [container, {}];
		i = 0;
		oldKeyedRefs = {};
		ref = [{}, {}];
		item = 'lmno';
		context = { parentCallback, customDocument, ref, teardowns: [], params: [state, containerRef, i, container, childNodes, oldKeyedRefs] };

		contexts.set(callback, context);
		documents.splice(0);
		documents.unshift(customDocument);
		callbacks.splice(0);
		callbacks.unshift(parentCallback);
		
		jest.clearAllMocks();
		reconcile.mockReturnValue(ref);
		callback.mockReturnValue(item);
	});

	it('executes the first time', () => {
		contexts.set(callback, undefined);
		let documentStack, callbackStack;

		callback.mockImplementation(() => {
			documentStack = [...documents];
			callbackStack = [...callbacks];
			return item;
		});

		const actual = execute(callback, state, containerRef, 0, container, childNodes, oldKeyedRefs);
		
		expect(callback).toHaveBeenCalledWith(state, [, {}]);
		expect(reconcile).toHaveBeenCalledWith(item, state, containerRef, 0, container, childNodes, oldKeyedRefs);

		expect(contexts.get(callback)).toEqual(context);
		expect(callbacks).toEqual([parentCallback]);
		expect(documents).toEqual([customDocument]);
		expect(documentStack).toEqual([customDocument, customDocument]);
		expect(callbackStack).toEqual([callback, parentCallback]);
		expect(actual).toEqual(ref);
	});

	it('executes a second time', () => {
		let documentStack, callbackStack;

		callback.mockImplementation(() => {
			documentStack = [...documents];
			callbackStack = [...callbacks];
			return item;
		});

		const actual = execute(callback, state, containerRef, 0, container, childNodes, oldKeyedRefs);
		
		expect(callback).toHaveBeenCalledWith(state, [, {}]);
		expect(reconcile).toHaveBeenCalledWith(item, state, containerRef, 0, container, childNodes, oldKeyedRefs);

		expect(contexts.get(callback)).toEqual(context);
		expect(callbacks).toEqual([parentCallback]);
		expect(documents).toEqual([customDocument]);
		expect(documentStack).toEqual([customDocument, customDocument]);
		expect(callbackStack).toEqual([callback, parentCallback]);
		expect(actual).toEqual(ref);
	});

	it('executes a reaction', () => {
		let documentStack, callbackStack;

		callback.mockImplementation(() => {
			documentStack = [...documents];
			callbackStack = [...callbacks];
			return item;
		});

		const actual = execute(callback);
		
		expect(callback).toHaveBeenCalledWith(state, ref);
		expect(reconcile).toHaveBeenCalledWith(item, state, containerRef, 0, container, childNodes, oldKeyedRefs);

		expect(contexts.get(callback)).toEqual(context);
		expect(callbacks).toEqual([parentCallback]);
		expect(documents).toEqual([customDocument]);
		expect(documentStack).toEqual([customDocument, customDocument]);
		expect(callbackStack).toEqual([callback, parentCallback]);
		expect(actual).toEqual(ref);
	});
});
