import { reconcile } from './reconcile';
import { forget } from './forget';
import { client } from '../client';

jest.mock('./forget');
jest.mock('../client');

describe('reconcile', () => {
	const appendChild = jest.fn();
	const insertBefore = jest.fn();
	const elementCallback = jest.fn();
	const fragmentCallback = jest.fn();
	const teardown = jest.fn();
	const stringCallback = jest.fn();
	const arrayCallback = jest.fn();
	let container, memory, elm, ctx, string, array, element, text, other,
		stringMemory, arrayMemory, elementMemory, fragmentMemory;

	beforeEach(() => {
		jest.clearAllMocks();
		container = { appendChild, insertBefore };
		elm = { '': [[], container] };
		memory = { '': [[], {}] };
		ctx = { '': [[], {}] };
		text = document.createTextNode('abc');
		element = document.createElement('div');
		other = document.createElement('span');
		stringMemory = { '': ['abc', text] };
		arrayMemory = { '': [[teardown, { '': [[], other] }]] };
		elementMemory = { '': [[], element] };
		fragmentMemory = { '': [[], {}] };
		string = 'abc';
		array = [];

		elementCallback.mockReturnValue(elementMemory);
		fragmentCallback.mockReturnValue(fragmentMemory);
		stringCallback.mockReturnValue(stringMemory);
		arrayCallback.mockReturnValue(arrayMemory);

		client.mockImplementation((tag, props, ...content) => {
			if (tag === string) return stringCallback;
			else return arrayCallback;
		});
	});

	it('populates children', () => {
		reconcile(memory, elm, [
			fragmentCallback,
			string,
			undefined,
			array,
			elementCallback
		], ctx);

		expect(elementCallback).toHaveBeenCalledWith(memory, elm, 4, ctx, undefined, undefined);
		expect(arrayCallback).toHaveBeenCalledWith(memory, elm, 3, ctx, element, undefined);
		expect(stringCallback).toHaveBeenCalledWith(memory, elm, 1, ctx, other, undefined);
		expect(fragmentCallback).toHaveBeenCalledWith(memory, elm, 0, ctx, text, undefined);
		expect(teardown).not.toHaveBeenCalled();
		expect(forget).not.toHaveBeenCalled();

		expect(appendChild.mock.calls).toEqual([
			[element]
		]);

		expect(insertBefore.mock.calls).toEqual([
			[text, other]
		]);

		expect(memory[''][0]).toEqual([
			fragmentMemory,
			stringMemory,
			undefined,
			arrayMemory,
			elementMemory
		]);
	});

	it('maintians children', () => {
		memory[''][0].push(
			fragmentMemory,
			stringMemory,
			undefined,
			arrayMemory,
			elementMemory
		);

		reconcile(memory, elm, [
			fragmentCallback,
			string,
			undefined,
			array,
			elementCallback
		], ctx);

		expect(elementCallback).toHaveBeenCalledWith(memory, elm, 4, ctx, undefined, undefined);
		expect(arrayCallback).toHaveBeenCalledWith(memory, elm, 3, ctx, element, undefined);
		expect(stringCallback).toHaveBeenCalledWith(memory, elm, 1, ctx, other, undefined);
		expect(fragmentCallback).toHaveBeenCalledWith(memory, elm, 0, ctx, text, undefined);
		expect(teardown).not.toHaveBeenCalled();
		expect(forget).not.toHaveBeenCalled();
		expect(appendChild).not.toHaveBeenCalled();
		expect(insertBefore).not.toHaveBeenCalled();

		expect(memory[''][0]).toEqual([
			fragmentMemory,
			stringMemory,
			undefined,
			arrayMemory,
			elementMemory
		]);
	});

	it('replaces children', () => {
		stringCallback.mockReturnValue({ '': [''] });
		const oldMemory = {};

		memory[''][0].push(
			fragmentMemory,
			stringMemory,
			teardown,
			arrayMemory,
			oldMemory
		);

		reconcile(memory, elm, [
			undefined,
			fragmentCallback,
			string,
			undefined,
			elementCallback
		], ctx);

		expect(elementCallback).toHaveBeenCalledWith(memory, elm, 4, ctx, undefined, undefined);
		expect(arrayCallback).not.toHaveBeenCalled();
		expect(stringCallback).toHaveBeenCalledWith(memory, elm, 2, ctx, element, undefined);
		expect(fragmentCallback).toHaveBeenCalledWith(memory, elm, 1, ctx, element, undefined);
		expect(teardown).not.toHaveBeenCalled();

		expect(forget.mock.calls).toEqual([
			[stringMemory, elm],
			[teardown, elm],
			[arrayMemory, elm],
			[oldMemory, elm]
		]);

		expect(appendChild.mock.calls).toEqual([
			[element]
		]);

		expect(insertBefore).not.toHaveBeenCalled();

		expect(memory[''][0]).toEqual([
			undefined,
			fragmentMemory,
			{ '': [''] },
			undefined,
			elementMemory
		]);
	});
});
