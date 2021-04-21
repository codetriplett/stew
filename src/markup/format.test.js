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
});
