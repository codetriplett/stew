import stew from '../stew';

describe('stew', () => {
	const markup = `
		<div>
			(
				<img src="("{string}")" alt="">
				<span>({string})</span>
			)
		</div>
	`;

	const template = {
		'': ['div',
			'(',
			{ '': ['img'], src: ['(', ['string'], ')'], alt: [''] },
			{ '': ['span', '(', ['string'], ')'] },
			')'
		]
	};

	const html = [
		'<div>',
			'(',
			'<img alt="" src="(abc)">',
			'<span>(abc)</span>',
			')',
		'</div>'
	].join('');

	it('parses markup', () => {
		const actual = stew(markup);
		expect(actual).toEqual(template);
	});

	it('renders html', () => {
		const actual = stew(template, { string: 'abc' });
		expect(actual).toBe(html);
	});
});
