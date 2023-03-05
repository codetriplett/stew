import execute, { contexts, documents, callbacks, updaters } from './execute';
import reconcile from './reconcile';
import { defaultUpdater, virtualDocument } from '.';

jest.mock('./reconcile');

describe('execute', () => {
	const parentCallback = jest.fn();
	let customDocument, customUpdater, callback, state, containerRef, i, prevRefs, container, childNodes, item, context, sibling;

	beforeEach(() => {
		customDocument = virtualDocument;
		customUpdater = defaultUpdater;
		documents.splice(0);
		documents.unshift(customDocument);
		callback = jest.fn();
		state = {};
		container = virtualDocument.createElement('div');
		childNodes = [];
		containerRef = [container, {}];
		i = 0;
		prevRefs = {};
		item = 'lmno';
		sibling = { node: {}, sibling: {} };
		context = [{ parentCallback, customDocument, customUpdater, teardowns: [] }, state, containerRef, i, prevRefs, container, sibling];

		contexts.set(callback, context);
		documents.splice(0);
		documents.unshift(customDocument);
		updaters.splice(0);
		updaters.unshift(customUpdater);
		callbacks.splice(0);
		callbacks.unshift(parentCallback);
		
		jest.clearAllMocks();
		reconcile.mockReturnValue(sibling);
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

		const ref = [, {}];
		containerRef[2] = ref;

		const actual = execute(callback, state, containerRef, 0, prevRefs, container, sibling);
		
		expect(callback).toHaveBeenCalledWith(state, ref);
		expect(reconcile).toHaveBeenCalledWith(item, state, containerRef, 0, prevRefs, container, sibling);

		expect(contexts.get(callback)).toEqual(context);
		expect(callbacks).toEqual([parentCallback]);
		expect(documents).toEqual([customDocument]);
		expect(documentStack).toEqual([customDocument, customDocument]);
		expect(callbackStack).toEqual([callback, parentCallback]);
		expect(actual).toEqual(sibling);
	});

	it('executes a second time', () => {
		let documentStack, callbackStack;

		callback.mockImplementation(() => {
			documentStack = [...documents];
			callbackStack = [...callbacks];
			return item;
		});

		const ref = [, {}];
		containerRef[2] = ref;

		const actual = execute(callback, state, containerRef, 0, prevRefs, container, sibling);
		
		expect(callback).toHaveBeenCalledWith(state, ref);
		expect(reconcile).toHaveBeenCalledWith(item, state, containerRef, 0, prevRefs, container, sibling);

		expect(contexts.get(callback)).toEqual(context);
		expect(callbacks).toEqual([parentCallback]);
		expect(documents).toEqual([customDocument]);
		expect(documentStack).toEqual([customDocument, customDocument]);
		expect(callbackStack).toEqual([callback, parentCallback]);
		expect(actual).toEqual(sibling);
	});

	it('executes a reaction', () => {
		let documentStack, callbackStack;

		callback.mockImplementation(() => {
			documentStack = [...documents];
			callbackStack = [...callbacks];
			return item;
		});

		const ref = [, {}];
		containerRef[2] = ref;

		const actual = execute(callback);
		
		expect(callback).toHaveBeenCalledWith(state, ref);
		expect(reconcile).toHaveBeenCalledWith(item, state, containerRef, 0, prevRefs, container, sibling);

		expect(contexts.get(callback)).toEqual(context);
		expect(callbacks).toEqual([parentCallback]);
		expect(documents).toEqual([customDocument]);
		expect(documentStack).toEqual([customDocument, customDocument]);
		expect(callbackStack).toEqual([callback, parentCallback]);
		expect(actual).toEqual(sibling);
	});
});
