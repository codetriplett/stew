import stew from '.';
import { parse, scribe } from './markup';
import { update } from './memory';

jest.mock('./markup');
jest.mock('./memory');

describe('stew', () => {
	let updateValue, parseValue, scribeValue;

	beforeEach(() => {
		jest.clearAllMocks();
		update.mockReturnValue(updateValue = {});
		parse.mockReturnValue(parseValue = {});
		scribe.mockReturnValue(scribeValue = {});
	});

	it('parses template', () => {
		const array = [];
		const actual = stew(array, 'first', 'second');

		expect(parse).toHaveBeenCalledWith(array, 'first', 'second');
		expect(actual).toBe(parseValue);
	});

	it('formats element outline', () => {
		const actual = stew('div', { '': 'id', key: 'value' }, 'first', 'second');
		expect(actual).toEqual({ '': [['first', 'second'], 'id', 'div'], key: 'value' });
	});

	it('formats component outline', () => {
		const tag = () => {};
		const actual = stew(tag, { '': 'id', key: 'value' }, 'first', 'second');
		expect(actual).toEqual({ '': [['first', 'second'], 'id', tag], key: 'value' });
	});

	it('formats fragment outline', () => {
		const actual = stew('', { '': 'id', key: 'value' }, 'first', 'second');
		expect(actual).toEqual({ '': [[], 'id', '', ['first', 'second']], key: 'value' });
	});

	it('renders html', () => {
		const actual = stew({ '': 'div', key: 'value' }, 'first', 'second');

		expect(scribe).toHaveBeenCalledWith({
			'': [['first', 'second'], undefined, 'div'],
			key: 'value'
		});

		expect(actual).toBe(scribeValue);
	});

	it('hydrates html', () => {
		const div = document.createElement('div');
		const img = document.createElement('img');
		div.appendChild(img);
		const refs = { '': { '': expect.any(Function) } };
		const elm = { '': [[],,, [div]] };
		const ctx = { '': [[], refs, expect.any(Function)] };
		const actual = stew(div, 'first', 'second');

		expect(update).toHaveBeenCalledWith({
			'': [['first', 'second'], undefined, 'div']
		}, elm, 0, refs, elm, ctx);

		expect(actual).toBe(div);
	});

	it('populates html', () => {
		const div = document.createElement('div');
		const img = document.createElement('img');
		div.appendChild(img);
		const refs = { '': { '': expect.any(Function) } };
		const elm = { '': [[],,, div] };
		const ctx = { '': [[], refs, expect.any(Function)] };
		const actual = stew({ '': div, key: 'value' }, 'first', 'second');

		expect(update).toHaveBeenCalledWith({
			'': [['first', 'second'], undefined, 'div'],
			key: 'value'
		}, elm, 0, refs, elm, ctx);

		expect(actual).toBe(div);
	});
});
