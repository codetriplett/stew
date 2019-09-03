import { render } from '../render';

describe('render', () => {
	it('renders tag', () => {
		const actual = render({ '': ['img'] }, {});
		expect(actual).toBe('<img>');
	});

	it('renders attributes', () => {
		const actual = render({
			'': ['img'], src: ['value'], alt: [''], width: [['number']]
		}, { number: 123 });

		expect(actual).toBe('<img alt="" src="value" width="123">');
	});

	it('renders children', () => {
		const actual = render({
			'': ['div', ['('], { '': ['img'] }, [')']]
		}, {});
		
		expect(actual).toBe('<div>(<img>)</div>');
	});
});
