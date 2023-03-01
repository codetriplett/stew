import execute, { contexts, stack, useEffect } from './execute';
import resolve from './resolve';

jest.mock('./resolve');

describe('execute', () => {
	let callback, document, state, template, node;

	beforeEach(() => {
		document = {};
		callback = jest.fn();
		state = {};
		template = ['div'];
		node = {};

		contexts.set(callback, { document, state, ref: [node, {}], i: 0 });
		stack.splice(0);
		
		jest.clearAllMocks();
		callback.mockReturnValue(template);
		resolve.mockReturnValue(node);
	});

	it('executes the first time', () => {
		const parentCallback = jest.fn();
		stack.unshift(parentCallback);
		const containerRef = [{}, {}];
		const actual = execute(callback, { document, state }, containerRef, 0);
		const context = { document, state, parentCallback, ref: [, {}], i: 0, teardowns: [] };
		
		expect(callback).toHaveBeenCalledWith(state, [, {}]);
		expect(resolve).toHaveBeenCalledWith(template, context, [, {}], 0);

		expect(contexts.get(callback)).toEqual(context);
		expect(stack).toEqual([parentCallback]);
		expect(actual).toEqual(node);
	});

	it('executes a second time', () => {
		const parentCallback = jest.fn();
		stack.unshift(parentCallback);
		const containerRef = [{}, {}, [node, {}]];
		const actual = execute(callback, { document, state }, containerRef, 0);
		const context = { document, state, parentCallback, ref: [node, {}], i: 0, teardowns: [] };
		
		expect(callback).toHaveBeenCalledWith(state, [node, {}]);
		expect(resolve).toHaveBeenCalledWith(template, context, [node, {}], 0);

		expect(contexts.get(callback)).toEqual(context);
		expect(stack).toEqual([parentCallback]);
		expect(actual).toEqual(node);
	});

	it('executes a reaction', () => {
		const actual = execute(callback);
		const context = { document, state, ref: [node, {}], i: 0, teardowns: [] };

		expect(callback).toHaveBeenCalledWith(state, [node, {}]);
		expect(resolve).toHaveBeenCalledWith(template, context, [node, {}], 0);

		expect(stack).toEqual([]);
		expect(actual).toEqual(node);
	});
});
