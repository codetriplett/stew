import { parse } from '../parse';

describe('parse', () => {
	it('should parse static text', () => {
		const actual = parse('value');
		expect(actual).toEqual(['value']);
	});

	it('should parse dynamic text', () => {
		const actual = parse('prefix{string}suffix');
		expect(actual).toEqual(['prefix', ['string'], 'suffix']);
	});

	it('should parse literal text', () => {
		const actual = parse('prefix{}suffix');
		expect(actual).toEqual(['prefix', [''], 'suffix']);
	});

	it('should parse element', () => {
		const actual = parse('<img src="http://"{domain}".com">');

		expect(actual).toEqual({
			src: ['http://', ['domain'], '.com'],
			'': ['img']
		});
	});

	it('should allow tags to inhabit multiple lines', () => {
		const actual = parse(`<img src="http://"
			{domain} ".com"
			alt="">`);

		expect(actual).toEqual({
			src: ['http://', ['domain'], '.com'],
			alt: [],
			'': ['img']
		});
	});

	it('should trim newlines', () => {
		const actual = parse(`
			<div>
				<img>
				<img> <img>
				<img>
			</div>
		`);

		expect(actual).toEqual({
			'': ['div',
				{ '': ['img'] },
				{ '': ['img'] },
				[' '],
				{ '': ['img'] },
				{ '': ['img'] }
			]
		});
	});

	it('should parse without prefix or suffix', () => {
		const actual = parse('<img src={domain}>');
		expect(actual.src).toEqual([['domain']]);
	});

	it('should parse without variable', () => {
		const actual = parse('<img src="http://image.com">');
		expect(actual.src).toEqual(['http://image.com']);
	});

	it('should parse without quotes', () => {
		const actual = parse('<img src=value>');
		expect(actual.src).toBe('value');
	});

	it('should ignore spaces between sections', () => {
		const actual = parse(`<img src="http://"
			{domain} ".com">`);

		expect(actual).toEqual({
			src: ['http://', ['domain'], '.com'],
			'': ['img']
		});
	});

	it('should parse scope', () => {
		const actual = parse('<img {value}>');
		expect(actual).toEqual({ '': [['value'], 'img'] });
	});

	it('should parse content', () => {
		const actual = parse('<div>({value})</div>');
		expect(actual).toEqual({ '': ['div', ['(', ['value'], ')']] });
	});

	it('should parse content on multiple lines', () => {
		const actual = parse(`<div>
			top
			bottom
			</div>`);

		expect(actual).toEqual({ '': ['div', ['topbottom']] });
	});

	it('should parse empty container', () => {
		const actual = parse('<div></div>');
		expect(actual).toEqual({ '': ['div', ''] });
	});
	
	it('should parse children', () => {
		const actual = parse('<div>(<img src="a"> <img src="b">)</div>');

		expect(actual['']).toEqual([
			'div',
			['('],
			{ src: ['a'], '': ['img'] },
			[' '],
			{ src: ['b'], '': ['img'] },
			[')']
		]);
	});
});
