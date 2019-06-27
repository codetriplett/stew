import { parse } from '../parse';

describe('parse', () => {
	it('should parse inner text', () => {
		const actual = parse('prefix{string}suffix');
		expect(actual).toEqual([['prefix', 'string', 'suffix'], '']);
	});

	it('should parse element', () => {
		const actual = parse('<img src="http://"{domain}".com">');

		expect(actual).toEqual([
			{ src: ['http://', 'domain', '.com'], '': ['img'] },
			''
		]);
	});

	it('should parse without prefix', () => {
		const actual = parse('<img src={domain}".com">');
		expect(actual[0].src).toEqual(['', 'domain', '.com']);
	});

	it('should parse without suffix', () => {
		const actual = parse('<img src="http://"{domain}>');
		expect(actual[0].src).toEqual(['http://', 'domain']);
	});

	it('should parse without prefix or suffix', () => {
		const actual = parse('<img src={domain}>');
		expect(actual[0].src).toEqual(['domain']);
	});

	it('should parse without variable', () => {
		const actual = parse('<img src="http://image.com">');
		expect(actual[0].src).toBe('http://image.com');
	});

	it('should not allow adjacent strings', () => {
		const actual = parse('<img src="http://image.com""/image">');
		expect(actual[0].src).toBe('http://image.com');
	});
	
	it('should parse children', () => {
		const actual = parse('<div>(<img src="a"><img src="b">)</div>');

		expect(actual).toEqual([
			{ '': ['div', [
				'(',
				{ src: 'a', '': ['img'] },
				{ src: 'b', '': ['img'] },
				')'
			]] },
			''
		]);
	});
});
