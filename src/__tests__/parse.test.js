import { parse } from '../parse';

describe('parse', () => {
	it('should parse dynamic text', () => {
		const actual = parse('prefix{string}suffix');
		expect(actual).toEqual([['string', 'prefix', 'suffix'], '']);
	});

	it('should parse static text', () => {
		const actual = parse('value');
		expect(actual).toEqual(['value', '']);
	});

	it('should parse element', () => {
		const actual = parse('<img src="http://"{domain}".com">');

		expect(actual).toEqual([
			{ src: ['domain', 'http://', '.com'], '': ['img'] },
			''
		]);
	});

	it('should parse without prefix', () => {
		const actual = parse('<img src={domain}".com">');
		expect(actual[0].src).toEqual(['domain', '', '.com']);
	});

	it('should parse without suffix', () => {
		const actual = parse('<img src="http://"{domain}>');
		expect(actual[0].src).toEqual(['domain', 'http://']);
	});

	it('should parse without prefix or suffix', () => {
		const actual = parse('<img src={domain}>');
		expect(actual[0].src).toEqual(['domain']);
	});

	it('should parse without variable', () => {
		const actual = parse('<img src="http://image.com">');
		expect(actual[0].src).toBe('http://image.com');
	});

	it('should parse without quotes', () => {
		const actual = parse('<img src=value>');
		expect(actual[0].src).toBe('value');
	});

	it('should not allow adjacent strings', () => {
		const actual = parse('<img src="http://image.com""/image">');
		expect(actual[0].src).toBe('http://image.com');
	});

	it('should parse content', () => {
		const actual = parse('<div>content</div>');
		expect(actual).toEqual([{ '': ['div', '', ['content']] }, '']);
	});
	
	it('should parse children', () => {
		const actual = parse('<div>(<img src="a"><img src="b">)</div>');

		expect(actual).toEqual([
			{ '': ['div', '', [
				'(',
				{ src: 'a', '': ['img'] },
				{ src: 'b', '': ['img'] },
				')'
			]] },
			''
		]);
	});
});
