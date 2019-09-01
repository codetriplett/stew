import { clean } from '../clean';
import { parse } from '../parse';

jest.mock('../clean', () => ({ clean: jest.fn() }));

describe('parse', () => {
	beforeEach(() => {
		clean.mockClear().mockReturnValue(['clean']);
	});

	it('parses static text', () => {
		const actual = parse('value');

		expect(clean).toHaveBeenCalledWith([['value']]);
		expect(actual).toBe('clean');
	});

	it('parses dynamic text', () => {
		const actual = parse('prefix{string}suffix');

		expect(clean).toHaveBeenCalledWith([['prefix', ['string'], 'suffix']]);
		expect(actual).toBe('clean');
	});

	it('parses literal text', () => {
		const actual = parse('prefix{}suffix');

		expect(clean).toHaveBeenCalledWith([['prefix', [''], 'suffix']]);
		expect(actual).toBe('clean');
	});

	it('parses element', () => {
		const actual = parse('<img src="("{}")" alt="" flag>');

		expect(clean).toHaveBeenCalledWith([
			[''],
			{ '': ['img'], src: ['(', [''], ')'], alt: [''], flag: [true] },
			[]
		]);

		expect(actual).toBe('clean');
	});

	it('parses tags that inhabit multiple lines', () => {
		const actual = parse(`<img src="http://"
			{domain}".com"
			alt="">`);

		expect(clean).toHaveBeenCalledWith([
			[''],
			{ '': ['img'], alt: [''], src: ['http://', ['domain'], '.com'] },
			[]
		]);

		expect(actual).toBe('clean');
	});

	it('parses without prefix or suffix', () => {
		const actual = parse('<img src={domain}>');

		expect(clean).toHaveBeenCalledWith([
			[''],
			{ '': ['img'], src: [['domain']] },
			[]
		]);

		expect(actual).toBe('clean');
	});

	it('parses without variable', () => {
		const actual = parse('<img src="http://image.com">');

		expect(clean).toHaveBeenCalledWith([
			[''],
			{ '': ['img'], src: ['http://image.com'] },
			[]
		]);

		expect(actual).toBe('clean');
	});

	it('ignores unwrapped values', () => {
		const actual = parse('<img src=prefix{value}suffix>');

		expect(clean).toHaveBeenCalledWith([
			[''],
			{ '': ['img'], src: [['value']] },
			[]
		]);

		expect(actual).toBe('clean');
	});

	it('parses scope', () => {
		const actual = parse('<img {value}>');

		expect(clean).toHaveBeenCalledWith([
			[''],
			{ '': [['value'], 'img'] },
			[]
		]);

		expect(actual).toBe('clean');
	});

	it('parses content', () => {
		const actual = parse('<div>({value})</div>');

		expect(clean.mock.calls).toEqual([
			[
				[
					['(', ['value'], ')']
				]
			],
			[
				[
					[''],
					{ '': ['div', 'clean'] },
					[]
				]
			]
		]);

		expect(actual).toBe('clean');
	});

	it('parses content that inhabits multiple lines', () => {
		const actual = parse(`<div>
				top
				bottom
			</div>`);

			expect(clean.mock.calls).toEqual([
				[
					[
						['\n\t\t\t\ttop\n\t\t\t\tbottom\n\t\t\t']
					]
				],
				[
					[
						[''],
						{ '': ['div', 'clean'] },
						[]
					]
				]
			]);
	
			expect(actual).toBe('clean');
	});

	it('parses children', () => {
		const actual = parse(`<div><img src="a"><img src="b"></>`);

		expect(clean.mock.calls).toEqual([
			[
				[
					[''],
					{ '': ['img'], src: ['a'] },
					[''],
					{ '': ['img'], src: ['b'] },
					['']
				]
			],
			[
				[
					[''],
					{ '': ['div', 'clean'] },
					[]
				]
			]
		]);

		expect(actual).toBe('clean');
	});

	it('parses children that inhabit multiple lines', () => {
		const actual = parse(`
			<div>
				<img>
				<img> <img>
				<img>
			</div>
		`);
		
		expect(clean.mock.calls).toEqual([
			[
				[
					['\n\t\t\t\t'],
					{ '': ['img'] },
					['\n\t\t\t\t'],
					{ '': ['img'] },
					[' '],
					{ '': ['img'] },
					['\n\t\t\t\t'],
					{ '': ['img'] },
					['\n\t\t\t'],
				]
			],
			[
				[
					['\n\t\t\t'],
					{ '': ['div', 'clean'] },
					['\n\t\t']
				]
			]
		]);

		expect(actual).toBe('clean');
	});

	it('parses empty container', () => {
		const actual = parse('<div></div>');
		
		expect(clean.mock.calls).toEqual([
			[
				[
					['']
				]
			],
			[
				[
					[''],
					{ '': ['div', 'clean'] },
					[]
				]
			]
		]);

		expect(actual).toBe('clean');
	});
});
