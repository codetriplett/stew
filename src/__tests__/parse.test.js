import { parse } from '../parse';

describe('parse', () => {
	let children;

	beforeEach(() => {
		children = [];
	});

	it('parses static text', () => {
		const actual = parse('value', children);

		expect(children).toEqual([['value']]);
		expect(actual).toBe('');
	});

	it('parses dynamic text', () => {
		const actual = parse('prefix {string} suffix', children);

		expect(children).toEqual([['prefix ', ['string'], ' suffix']]);
		expect(actual).toBe('');
	});

	it('parses comparison with true', () => {
		const actual = parse('prefix{boolean true}suffix', children);

		expect(children).toEqual([['prefix', ['boolean', true], 'suffix']]);
		expect(actual).toBe('');
	});

	it('parses comparison with false', () => {
		const actual = parse('prefix{boolean false}suffix', children);

		expect(children).toEqual([['prefix', ['boolean', false], 'suffix']]);
		expect(actual).toBe('');
	});

	it('parses comparison with false', () => {
		const actual = parse('prefix{number 1}suffix', children);

		expect(children).toEqual([['prefix', ['number', 1], 'suffix']]);
		expect(actual).toBe('');
	});

	it('parses comparison with another key', () => {
		const actual = parse('prefix{first second}suffix', children);

		expect(children).toEqual([['prefix', ['first', 'second'], 'suffix']]);
		expect(actual).toBe('');
	});

	it('parses comparison with an inverted key', () => {
		const actual = parse('prefix{first -second}suffix', children);

		expect(children).toEqual([['prefix', ['first', '-second'], 'suffix']]);
		expect(actual).toBe('');
	});

	it('parses literal text', () => {
		const actual = parse('prefix{}suffix', children);

		expect(children).toEqual([['prefix', [''], 'suffix']]);
		expect(actual).toBe('');
	});

	it('parses element', () => {
		const actual = parse('<img src="("{}")" alt="" flag>');

		expect(actual).toEqual({
			'': ['img'], src: ['(', [''], ')'], alt: [''], flag: [true]
		});
	});

	it('parses component', () => {
		const actual = parse('<template name="value" /data/{value}>');

		expect(actual).toEqual({
			'': ['template/', ['data/', ['value']]], name: ['value']
		});
	});

	it('parses component without properties or data', () => {
		const actual = parse('<template />');
		expect(actual).toEqual({ '': ['template/', []] });
	});

	it('parses component without space before data', () => {
		const actual = parse('<template/data/{value}>');

		expect(actual).toEqual({
			'': ['template/', ['data/', ['value']]]
		});
	});

	it('parses tags that inhabit multiple lines', () => {
		const actual = parse(`
			<img src="http://"
				{domain}".com"
				alt="">
		`);

		expect(actual).toEqual({
			'': ['img'], alt: [''], src: ['http://', ['domain'], '.com']
		});
	});

	it('parses without prefix or suffix', () => {
		const actual = parse('<img src={domain}>');
		expect(actual).toEqual({ '': ['img'], src: [['domain']] });
	});

	it('parses without variable', () => {
		const actual = parse('<img src="http://image.com">');
		expect(actual).toEqual({ '': ['img'], src: ['http://image.com'] });
	});

	it('ignores unwrapped values', () => {
		const actual = parse('<img src=prefix{value}suffix>');
		expect(actual).toEqual({ '': ['img'], src: [['value']] });
	});

	it('parses scope', () => {
		const actual = parse('<img {value}>');
		expect(actual).toEqual({ '': [[['value']], 'img'] });
	});

	it('parses content', () => {
		const actual = parse('<div>({value})</>');
		expect(actual).toEqual({ '': ['div', ['(', ['value'], ')']] });
	});

	it('parses content that inhabits multiple lines', () => {
		const actual = parse(`
			<div>
				top
				bottom
			</div>
		`);
	
		expect(actual).toEqual({'': ['div', ['top bottom']]});
	});

	it('parses children', () => {
		const actual = parse(`<div><img src="a"><img src="b"></>`);

		expect(actual).toEqual({
			'': ['div',
				{ '': ['img'], src: ['a'] },
				{ '': ['img'], src: ['b'] }
			]
		});
	});

	it('parses children that inhabit multiple lines', () => {
		const actual = parse(`
			<div>
				<img>
				<img> <img>
				<img>
			</>
		`);

		expect(actual).toEqual({
			'': ['div',
				{ '': ['img'] },
				{ '': ['img'] },
				{ '': ['img'] },
				{ '': ['img'] }
			]
		});
	});

	it('parses empty container', () => {
		const actual = parse('<div></>');
		expect(actual).toEqual({ '': ['div', ['']] });
	});
});
