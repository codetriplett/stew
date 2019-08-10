import $ from './mock';

describe('mock', () => {
	it('should prepare state', () => {
		const object = { value: 'string' };
		const actual = $(object);

		expect(actual).toEqual({ '': object, value: 'string' });
	});

	it('should prepare state with scope', () => {
		const actual = $({ value: 'string' }, 'value');
		expect(actual).toEqual({ '': 'string', value: 'string' });
	});

	it('should prepare state with iteration', () => {
		const actual = $({ value: ['one', 'two'] }, 'value.1');
		expect(actual).toEqual({ '': 'two', '.': 1, value: ['one', 'two'] });
	});

	it('should prepare expression', () => {
		const actual = $('prefix{value string}suffix');
		expect(actual).toEqual(['prefix', ['.value', 'string'], 'suffix']);
	});

	it('should prepare template', () => {
		const actual = $('<img src="string" />');
		expect(actual).toEqual({ '': ['img'], src: 'string' });
	});

	it('should create element', () => {
		const actual = $('br', {});
		expect(actual.tagName.toLowerCase()).toBe('br');
	});

	it('should set attributes', () => {
		const actual = $('img', { src: 'string' });
		expect(actual.getAttribute('src')).toBe('string');
	});

	it('should set children', () => {
		const actual = $('div', [$('string'), $('br', {})]);
		const [string, br] = actual.childNodes;

		expect(string.nodeValue).toBe('string');
		expect(br.tagName.toLowerCase()).toBe('br');
	});

	it('should set attributes and children', () => {
		const actual = $('a', { href: 'string' }, [$('string')]);

		expect(actual.getAttribute('href')).toBe('string');
		expect(actual.childNodes[0].nodeValue).toBe('string');
	});
});
