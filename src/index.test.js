import stew from '.';
import { parse, scribe } from './markup';
import { update } from './memory';

jest.mock('./markup');
jest.mock('./memory');

describe('stew', () => {
	let updateValue, parseValue, scribeValue;

	beforeEach(() => {
		jest.clearAllMocks();
		update.mockReturnValue(updateValue);
		parse.mockReturnValue(parseValue);
		scribe.mockReturnValue(scribeValue);
	});

	it('parses template', () => {
		const array = [];
		const actual = stew(array, 'first', 'second');

		expect(parse).toHaveBeenCalledWith(array, 'first', 'second');
		expect(actual).toEqual(parseValue);
	});

	it('formats outline', () => {
		const actual = stew('div', { '': 'id', key: 'value' }, 'first', 'second');
		expect(actual).toEqual({ '': [['first', 'second'], 'id', 'div'], key: 'value' });
	});

	it('renders html', () => {
		const actual = stew({ '': 'div', key: 'value' }, 'first', 'second');

		expect(scribe).toHaveBeenCalledWith({
			'': [['first', 'second'], undefined, 'div'],
			key: 'value'
		});

		expect(actual).toEqual(scribeValue);
	});

	it('hydrates html', () => {
		const div = document.createElement('div');
		const img = document.createElement('img');
		div.appendChild(img);
		const elm = { '': [[], div, 'div', [img]] };
		const actual = stew({ '': div, key: 'value' }, 'first', 'second');

		expect(update).toHaveBeenCalledWith({
			'': [['first', 'second'], undefined, 'div'],
			key: 'value'
		}, elm, 0, elm);

		expect(actual).toEqual(scribeValue);
	});
});
