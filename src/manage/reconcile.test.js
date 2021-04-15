import { update } from '../memory';
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
	let container, memory, elm, ctx, string, array, element, text, other,
		elementOutline, contextOutline,
		stringMemory, arrayMemory, elementMemory, contextMemory;

	beforeEach(() => {
		jest.clearAllMocks();
		container = { appendChild, insertBefore };
		elm = { '': [[], container] };
		memory = { '': [[], {}] };
		ctx = { '': [[], {}] };
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
		reconcile(memory, [
			contextOutline,
			string,
			undefined,
			array,
			elementOutline
		], elm, ctx);

		expect(forget).not.toHaveBeenCalled();

		expect(appendChild.mock.calls).toEqual([
			[element]
		]);

		expect(insertBefore.mock.calls).toEqual([
			[text, other]
		]);

		expect(memory[''][0]).toEqual([
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
		], elm, ctx);

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
			string,
			undefined,
			elementOutline
		], elm, ctx);

		expect(forget.mock.calls).toEqual([
			[oldStringMemory, elm],
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
			contextMemory,
			stringMemory,
			undefined,
			elementMemory
		]);
	});
});
