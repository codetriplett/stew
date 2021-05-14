import { update, normalize } from '../memory';
import { normalize as mockNormalize } from '../memory/normalize';
import { forget } from './forget';
import { locate } from './locate';
import { reconcile } from './reconcile';

jest.mock('../memory');
jest.mock('./forget');
jest.mock('./locate');

describe('reconcile', () => {
	const appendChild = jest.fn();
	const insertBefore = jest.fn();
	const teardown = () => {};

	let container, memory, state, elm, ctx, string, array, element, text, other,
		elementOutline, contextOutline, stringMemory, arrayMemory, elementMemory,
		contextMemory, refs;

	beforeEach(() => {
		jest.clearAllMocks();
		normalize.mockImplementation((...params) => mockNormalize(...params));
		container = { appendChild, insertBefore };
		elm = { '': [[], container] };
		memory = { '': [[], {}] };
		state = { '': () => 1 };
		ctx = { '': [[], { '': state }], key: 'ctx value' };
		text = document.createTextNode('abc');
		element = document.createElement('div');
		other = document.createElement('span');
		string = 'abc';
		array = [];
		elementOutline = { '': [[], '', 'div'] };
		contextOutline = { '': [[], {}, () => {}] };
		stringMemory = { '': ['abc', text] };
		arrayMemory = { '': [[teardown, { '': [[], other] }],, ''] };
		elementMemory = { '': [[], element, 'div'] };
		contextMemory = { '': [[], {}, () => {}] };
		refs = {};

		update.mockImplementation(child => {
			switch (child) {
				case elementOutline: return elementMemory;
				case contextOutline: return contextMemory;
			}

			switch (child[''][2]) {
				case undefined: return stringMemory;
				case '': return arrayMemory;
			}
		});

		locate.mockImplementation(fragment => {
			if (fragment === arrayMemory[''][0]) return other;
		});
	});

	it('populates children', () => {
		const effect = jest.fn();

		reconcile(memory, [
			effect,
			contextOutline,
			string,
			undefined,
			array,
			elementOutline,
		], refs, elm, ctx);

		expect(effect).toHaveBeenCalledWith({ key: 'ctx value', '': undefined });
		expect(forget).not.toHaveBeenCalled();

		expect(appendChild.mock.calls).toEqual([
			[element]
		]);

		expect(insertBefore.mock.calls).toEqual([
			[text, other]
		]);

		expect(memory[''][0]).toEqual([
			undefined,
			contextMemory,
			stringMemory,
			undefined,
			arrayMemory,
			elementMemory
		]);
	});

	it('maintians children', () => {
		memory[''][0].push(
			contextMemory,
			stringMemory,
			undefined,
			arrayMemory,
			elementMemory
		);

		reconcile(memory, [
			contextOutline,
			string,
			undefined,
			array,
			elementOutline
		], refs, elm, ctx);

		expect(forget).not.toHaveBeenCalled();
		expect(appendChild).not.toHaveBeenCalled();
		expect(insertBefore).not.toHaveBeenCalled();

		expect(memory[''][0]).toEqual([
			contextMemory,
			stringMemory,
			undefined,
			arrayMemory,
			elementMemory
		]);
	});

	it('replaces children', () => {
		const oldStringMemory = stringMemory;
		const oldMemory = {};
		stringMemory = { '': [''] };

		memory[''][0].push(
			contextMemory,
			oldStringMemory,
			teardown,
			elementMemory,
			arrayMemory,
			oldMemory
		);

		reconcile(memory, [
			undefined,
			contextOutline,
			'',
			undefined,
			elementOutline
		], refs, elm, ctx);

		expect(forget.mock.calls).toEqual([
			[oldStringMemory, elm],
			[arrayMemory, elm],
			[oldMemory, elm]
		]);

		expect(appendChild.mock.calls).toEqual([
			[element]
		]);

		expect(insertBefore).not.toHaveBeenCalled();

		expect(memory[''][0]).toEqual([
			undefined,
			contextMemory,
			undefined,
			undefined,
			elementMemory
		]);
	});
});
