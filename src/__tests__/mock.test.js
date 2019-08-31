import $ from '../mock';

describe('mock', () => {
	it('should prepare state', () => {
		const object = { value: 'string' };
		const actual = $(object);

		expect(actual).toEqual({ '': object, value: 'string' });
	});

	it('should prepare nested', () => {
		const child = { value: 'child' };
		const parent = { value: 'parent', child };
		const actual = $(child, parent);

		expect(actual).toEqual({ '': parent, value: 'child' });
	});

	it('should prepare expression', () => {
		const actual = $('prefix{value}suffix');
		expect(actual).toEqual(['prefix', ['value'], 'suffix']);
	});

	it('should prepare template', () => {
		const actual = $('<img src="string" />');
		expect(actual).toEqual({ '': ['img'], src: ['string'] });
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
