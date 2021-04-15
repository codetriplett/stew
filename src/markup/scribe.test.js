import { escape } from './escape';
import { scribe } from './scribe';

jest.mock('./escape');

describe('scribe', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		escape.mockImplementation(value => value);
	});

	it('scribes singleton tag', () => {
		const actual = scribe({ '': [[], '', 'img'] });
		expect(actual).toEqual('<img>');
	});

	it('scribes container tag', () => {
		const actual = scribe({ '': [[], '', 'div'] });
		expect(actual).toEqual('<div></div>');
	});

	it('scribes content', () => {
		const content = ['(', [{ '': [[], '', 'img'] }], ')'];
		const actual = scribe({ '': [content, '', 'div'] });
		expect(actual).toEqual('<div>(<img>)</div>');
	});

	it('scribes component', () => {
		function component ({ string }) { return ['(', string, ')']; }
		const actual = scribe({ '': [[], '', component], string: 'abc' });
		expect(actual).toEqual('(abc)');
	});

	it('scribes text', () => {
		const actual = scribe('abc');
		expect(actual).toEqual('abc');
	});

	it('scribes fragment', () => {
		const actual = scribe(['(', ')']);
		expect(actual).toEqual('()');
	});

	it('ignores effect functions', () => {
		const actual = scribe(() => {});
		expect(actual).toEqual('');
	});

	it('scribes attributes', () => {
		const attributes = {
			onclick: () => {},
			string: 'abc',
			number: 123,
			zero: 0,
			true: true,
			false: false,
			null: null,
			undefined: undefined,
			object: {},
			array: ['abc', 'xyz'],
			style: { color: 'green', fontSize: '13px' }
		};

		const actual = scribe({ '': [[], '', 'img'], ...attributes });

		expect(actual).toEqual(`<img
			onclick="javascript:void(0);"
			string="abc"
			number="123"
			zero="0"
			true
			array="abc xyz"
			style="color:green;font-size:13px;">`.replace(/\s+/g, ' '));
	});
});
