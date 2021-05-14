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

	it('ignores empty string', () => {
		const actual = scribe({ '': [''] });
		expect(actual).toEqual('');
	});

	it('ignores outlines without content', () => {
		const actual = scribe({ '': [] });
		expect(actual).toEqual('');
	});

	it('scribes content', () => {
		const content = ['abc', [img], 'xyz'];
		const actual = scribe({ '': [content, '', 'div'] });
		expect(actual).toEqual('<div>abc<img>xyz</div>');
	});

	it('scribes script', () => {
		const content = [
			'var open = \'<script>\';',
			{ '': [['content'],, 'p'] },
			'var close = \'</script>\';'
		];

		const actual = scribe({ '': [content, '', 'script'] });
		expect(actual).toEqual('<script>var open = \'<script>\';var close = \'</script>\';</script>');
	});

	it('scribes style', () => {
		const content = [
			'div { color: red; }',
			{ '': [['content'],, 'p'] },
			'span { color: blue; }'
		];

		const actual = scribe({ '': [content, '', 'style'] });
		expect(actual).toEqual('<style>div { color: red; }span { color: blue; }</style>');
	});

	it('scribes textarea', () => {
		const content = [
			'upper content.',
			{ '': [['content'],, 'p'] },
			'lower content.'
		];

		const actual = scribe({ '': [content, '', 'textarea'] });
		expect(actual).toEqual('<textarea>upper content.lower content.</textarea>');
	});

	it('scribes component', () => {
		function component ({ string }) { return [string, img, string]; }
		const actual = scribe({ '': [[], '', component], string: 'abc' });
		expect(actual).toEqual('abc<img>abc');
	});

	it('scribes text outline', () => {
		const actual = scribe({ '': ['abc'] });
		expect(actual).toEqual('abc');
	});

	it('scribes fragment outline', () => {
		const actual = scribe({ '': [['(', img, ')'], '', ''] });
		expect(actual).toEqual('(<img>)');
	});

	it('ignores effect functions', () => {
		const actual = scribe({ '': [[() => {}],, ''] });
		expect(actual).toEqual('');
	});

	it('scribes text', () => {
		const actual = scribe({ '': [['abc'],, ''] });
		expect(actual).toEqual('abc');
	});

	it('scribes fragment', () => {
		const actual = scribe({ '': [[['(', img, ')']],, ''] });
		expect(actual).toEqual('(<img>)');
	});

	it('ignores objects without core', () => {
		const actual = scribe({ '': [[{ key: 'value' }],, ''] });
		expect(actual).toEqual('');
	});

	it('scribes custom fragment', () => {
		const actual = scribe({
			'': [[], '', '', [
				() => '<i>Key: </i>',
				'<b>Value</b>'
			]]
		});

		expect(actual).toEqual('<i>Key: </i><b>Value</b>');
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
			const actual = scribe({ '': ['abc'] }, 'xyz');
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
