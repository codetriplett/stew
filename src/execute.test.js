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

		contexts.set(callback, { document, state, refs: [{}] });
		stack.splice(0);
		
		jest.clearAllMocks();
		callback.mockReturnValue(template);
		resolve.mockReturnValue(node);
	});

	it('executes the first time', () => {
		const refs = [{}];
		const actual = execute(callback, { document, state, refs }, refs);
		const context = { document, state, hasMounted: true, refs: [{}], teardowns: [] };
		
		expect(callback).toHaveBeenCalledWith(state, {});
		expect(resolve).toHaveBeenCalledWith(template, context, [{}]);

		expect(contexts.get(callback)).toEqual(context);
		expect(stack).toEqual([]);
		expect(actual).toEqual(node);
	});

	it('executes a second time', () => {
		const refs = [{}, node];
		const actual = execute(callback, { document, state, refs }, refs);
		const context = { document, state, hasMounted: true, refs: [{}], teardowns: [] };
		
		expect(callback).toHaveBeenCalledWith(state, {});
		expect(resolve).toHaveBeenCalledWith(template, context, [{}, node]);

		expect(contexts.get(callback)).toEqual(context);
		expect(stack).toEqual([]);
		expect(actual).toEqual(node);
	});

	it('executes a reaction', () => {
		const actual = execute(callback);
		const refs = [{}];
		const context = { document, state, hasMounted: true, refs, teardowns: [] };

		expect(callback).toHaveBeenCalledWith(state, {});
		expect(resolve).toHaveBeenCalledWith(template, context, refs);

		expect(stack).toEqual([]);
		expect(actual).toEqual(node);
	});
});
