import stew from '../stew';

describe('stew', () => {
	it('generates html', () => {
		const actual = stew({
			'': ['div',
				'(',
				{ '': ['img'], src: ['(', ['string'], ')'], alt: '' },
				{ '': ['span', '(', ['string'], ')'] },
				')'
			]
		}, { string: 'abc' });

		expect(actual).toBe([
			'<div>',
				'(',
				'<img alt="" src="(abc)">',
				'<span>(abc)</span>',
				')',
			'</div>'
		].join(''));
	});
});
