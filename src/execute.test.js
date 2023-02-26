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

		contexts.set(callback, { document, state, previousRefs: {}, currentRefs: {} });
		stack.splice(0);
		
		jest.clearAllMocks();
		callback.mockReturnValue(template);
		resolve.mockReturnValue(node);
	});

	it('executes the first time', () => {
		contexts.set(callback, undefined);
		const actual = execute(callback, { document, state, previousRefs: {}, currentRefs: {} });

		expect(callback).toHaveBeenCalledWith(state, {});
		expect(resolve).toHaveBeenCalledWith(template, { document, state, hasMounted: true, previousRefs: {}, currentRefs: {}, teardowns: [] });

		expect(contexts.get(callback)).toEqual({ document, state, hasMounted: true, previousRefs: {}, currentRefs: {}, teardowns: [] });
		expect(stack).toEqual([]);
		expect(actual).toEqual(node);
	});

	it('executes a second time', () => {
		const actual = execute(callback);

		expect(callback).toHaveBeenCalledWith(state, {});
		expect(resolve).toHaveBeenCalledWith(template, { document, state, hasMounted: true, previousRefs: {}, currentRefs: {}, teardowns: [] });

		expect(stack).toEqual([]);
		expect(actual).toEqual(node);
	});
});
