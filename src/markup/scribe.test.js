import { escape } from './escape';
import { scribe } from './scribe';

jest.mock('./escape');

describe('scribe', () => {
	let img;

	beforeEach(() => {
		jest.clearAllMocks();
		escape.mockImplementation(value => value);
		img = { '': [[], '', 'img'] };
	});

	it('scribes singleton tag', () => {
		const actual = scribe(img);
		expect(actual).toEqual('<img>');
	});

	it('scribes container tag', () => {
		const actual = scribe({ '': [[], '', 'div'] });
		expect(actual).toEqual('<div></div>');
	});

	it('ignores effect functions', () => {
		const actual = scribe(() => {});
		expect(actual).toEqual('');
	});

	it('ignores empty value', () => {
		const actual = scribe(undefined);
		expect(actual).toEqual('');
	});

	it('scribes content', () => {
		const content = ['(', [img], ')'];
		const actual = scribe({ '': [content, '', 'div'] });
		expect(actual).toEqual('<div>(<img>)</div>');
	});

	it('scribes script', () => {
		const content = ['var tag = \'<script>\';'];
		const actual = scribe({ '': [content, '', 'script'] });
		expect(actual).toEqual('<script>var tag = \'<script>\';</script>');
	});

	it('scribes style', () => {
		const content = ['div { color: red; }', 'span { color: blue; }'];
		const actual = scribe({ '': [content, '', 'style'] });
		expect(actual).toEqual('<style>div { color: red; }span { color: blue; }</style>');
	});

	it('scribes component', () => {
		function component ({ string }) { return [string, img, string]; }
		const actual = scribe({ '': [[], '', component], string: 'abc' });
		expect(actual).toEqual('abc<img>abc');
	});

	it('scribes text', () => {
		const actual = scribe('abc');
		expect(actual).toEqual('abc');
	});

	it('scribes fragment', () => {
		const actual = scribe(['(', img, ')']);
		expect(actual).toEqual('(<img>)');
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

		const actual = scribe({ ...img, ...attributes });

		expect(actual).toEqual(`<img
			onclick="javascript:void(0);"
			string="abc"
			number="123"
			zero="0"
			true
			array="abc xyz"
			style="color:green;font-size:13px;">`.replace(/\s+/g, ' '));
	});

	describe('comments', () => {
		it('inserts comment between text nodes', () => {
			const actual = scribe('abc', 'xyz');
			expect(actual).toEqual('abc<!-- -->');
		});

		it('does not insert comments around element', () => {
			const actual = scribe({
				'': [['abc', { '': [[], '', 'img'] }, 'xyz'], '', 'div']
			});

			expect(actual).toEqual('<div>abc<img>xyz</div>');
		});

		it('skips over array if it has no children', () => {
			const actual = scribe({
				'': [['abc', { '': [[], '', ''] }, 'xyz'], '', 'div']
			});

			expect(actual).toEqual('<div>abc<!-- -->xyz</div>');
		});

		it('uses sibling from array', () => {
			const actual = scribe({
				'': [['abc', { '': [['lmno'], '', ''] }, 'xyz'], '', 'div']
			});

			expect(actual).toEqual('<div>abc<!-- -->lmno<!-- -->xyz</div>');
		});

		it('more complex test', () => {
			const actual = scribe({
				'': [[
					undefined,
					'abc',
					{ '': [['lmno'], '', ''] },
					() => {},
					[
						img,
						[]
					],
					'xyz',
					undefined
				], '', 'div']
			});

			expect(actual).toEqual('<div>abc<!-- -->lmno<img>xyz</div>');
		});
	});
});
