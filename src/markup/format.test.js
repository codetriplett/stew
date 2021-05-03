import { format } from './format';

describe('format', () => {
	it('should format static attributes', () => {
		const actual = format([
			'img before alt= after src="http://domain.com/image.jpg"'
		]);

		expect(actual).toEqual({
			'': [[], undefined, 'img'],
			before: true,
			after: true,
			alt: '',
			src: 'http://domain.com/image.jpg'
		});
	});

	it('should format dynamic attributes', () => {
		const tag = () => {};

		const actual = format([
			'',
			tag,
			'number=',
			123,
			''
		]);

		expect(actual).toEqual({
			'': [[], undefined, tag],
			number: 123
		});
	});

	it('should include base object', () => {
		const actual = format([
			'div',
			{ '': 'id', string: 'abc' },
			'boolean'
		]);

		expect(actual).toEqual({
			'': [[], 'id', 'div'],
			string: 'abc',
			boolean: true
		});
	});

	it('should pass back closed tag', () => {
		const actual = format(['/']);
		expect(actual).toEqual(undefined);
	});

	it('should handle self closing tag', () => {
		const actual = format(['div /']);
		expect(actual).toEqual({ '': [undefined, undefined, 'div'] });
	});

	it('should ignore everything after slash', () => {
		const actual = format(['div / key="value"']);
		expect(actual).toEqual({ '': [undefined, undefined, 'div'] });
	});

	it('should handle an open fragment tag', () => {
		const actual = format(['']);
		expect(actual).toEqual({ '': [[], undefined, '', []] });
	});

	it('should handle an open fragment tag with object', () => {
		const actual = format(['', { '': 'id', key: 'value' }, '']);
		expect(actual).toEqual({ '': [[], 'id', '', []], key: 'value' });
	});

	it('should handle an invalid tag', () => {
		const actual = format(['', undefined, '']);
		expect(actual).toEqual(undefined);
	});
});
