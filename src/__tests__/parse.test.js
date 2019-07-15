import { parse } from '../parse';

describe('parse', () => {
	it('should parse static text', () => {
		const actual = parse('value');
		expect(actual).toEqual([['value'], '']);
	});

	it('should parse dynamic text', () => {
		const actual = parse('prefix{string}suffix');
		expect(actual).toEqual([['prefix', ['string'], 'suffix'], '']);
	});

	it('should parse conditional text', () => {
		const actual = parse('prefix{string: value}suffix');

		expect(actual).toEqual([
			['prefix', ['string', 'value'], 'suffix'],
			''
		]);
	});

	it('should parse element', () => {
		const actual = parse('<img src="http://"{domain}".com">');

		expect(actual).toEqual([
			{ src: ['http://', ['domain'], '.com'], '': ['img'] },
			''
		]);
	});

	it('should parse without prefix or suffix', () => {
		const actual = parse('<img src={domain}>');
		expect(actual[0].src).toEqual([['domain']]);
	});

	it('should parse without variable', () => {
		const actual = parse('<img src="http://image.com">');
		expect(actual[0].src).toBe('http://image.com');
	});

	it('should add static classes to selector', () => {
		const actual = parse('<img class="first before"{value}"after last">');

		expect(actual).toEqual([
			{ class: ['before', ['value'], 'after'], '': ['img.first.last'] },
			''
		]);
	});

	it('should not add conditional classes to selector', () => {
		const actual = parse('<img class="static "{value:1}" dynamic">');

		expect(actual).toEqual([
			{ class: [['value', '1'], ' dynamic'], '': ['img.static'] },
			''
		]);
	});

	it('should parse without quotes', () => {
		const actual = parse('<img src=value>');
		expect(actual[0].src).toBe('value');
	});

	it('should ignore spaces between sections', () => {
		const actual = parse(`<img src="http://"
			{domain} ".com">`);

		expect(actual).toEqual([
			{ src: ['http://', ['domain'], '.com'], '': ['img'] },
			''
		]);
	});

	it('should parse scope', () => {
		const actual = parse('<img {value}>');
		expect(actual).toEqual([{ '': ['img value'] }, '']);
	});

	it('should parse scope with static class', () => {
		const actual = parse('<img {value} class="static">');
		expect(actual).toEqual([{ '': ['img.static value'] }, '']);
	});

	it('should parse content', () => {
		const actual = parse('<div>({value})</div>');

		expect(actual).toEqual([
			{ '': ['div', ['(', ['value'], ')']] },
			''
		]);
	});

	it('should parse empty container', () => {
		const actual = parse('<div></div>');

		expect(actual).toEqual([
			{ '': ['div', ['']] },
			''
		]);
	});
	
	it('should parse children', () => {
		const actual = parse('<div>(<img src="a"> <img src="b">)</div>');

		expect(actual).toEqual([
			{ '': ['div',
				['('],
				{ src: 'a', '': ['img'] },
				[' '],
				{ src: 'b', '': ['img'] },
				[')']
			] },
			''
		]);
	});
});
