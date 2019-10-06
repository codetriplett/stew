import stew from '../stew';

describe('stew', () => {
	it('parses markup', () => {
		const actual = stew('<img>');
		expect(actual).toEqual({ '': ['img'] });
	});

	it('renders html', () => {
		const template = stew(`
			<div>
				(
					<img src="("{string.}")" alt="">
					<span>({string})</span>
				)
			</div>
		`);

		const actual = stew(template, { string: 'abc' });

		expect(actual).toEqual([
			'<div data--="{"string":"abc"}">',
				'(',
				'<img src="(abc)" alt="">',
				'<span>(abc)</span>',
				')',
			'</div>'
		].join(''));
	});
});
