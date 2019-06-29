import { render } from '../render';

describe('render', () => {
	it('should render static string', () => {
		const actual = render('static', { string: 'dynamic' });
		expect(actual).toBe('static');
	});

	it('should render dynamic string', () => {
		const actual = render(['string', '(', ')'], { string: 'dynamic' });
		expect(actual).toBe('(dynamic)');
	});

	it('should render container tag', () => {
		const actual = render({ attribute: 'value', '': ['tag', '', []] });
		expect(actual).toBe('<tag attribute="value"></tag>');
	});

	it('should render self closing tag', () => {
		const actual = render({ attribute: 'value', '': ['tag'] });
		expect(actual).toBe('<tag attribute="value">');
	});

	it('should render children', () => {
		const actual = render({ attribute: 'value', '': ['tag', '', [
			{ first: 'alpha', '': ['one', ''] },
			{ second: 'beta', '': ['two', ''] }
		]] });

		expect(actual).toBe([
			'<tag attribute="value">',
				'<one first="alpha">',
				'<two second="beta">',
			'</tag>'
		].join(''));
	});

	it('should use variables', () => {
		const actual = render(
			{ attribute: ['string', '^', '$'], '': ['tag'] },
			{ string: 'value' }
		);

		expect(actual).toBe('<tag attribute="^value$">');
	});

	it('should use object scope', () => {
		const actual = render(
			{ attribute: ['string'], '': ['tag', 'object'] },
			{ string: 'upper', object: { string: 'lower' } },
			0
		);

		expect(actual).toBe('<tag attribute="lower" data-stew="0">');
	});

	it('should use empty scope', () => {
		const actual = render(
			{ attribute: ['missing', ''], '': ['tag', 'object'] },
			{ string: 'value' }
		);

		expect(actual).toBe('');
	});

	it('should use array scope', () => {
		const actual = render(
			{ attribute: ['string'], '': ['tag', 'array'] },
			{ array: [{ string: 'first' }, { string: 'second' }] },
			0
		);
		
		expect(actual).toBe([
			'<tag attribute="first" data-stew="0-0">',
			'<tag attribute="second" data-stew="0-1">'
		].join(''));
	});

	it('should use string scope', () => {
		const actual = render(
			{ attribute: [''], '': ['tag', 'string'] },
			{ string: 'value' }
		);

		expect(actual).toBe('<tag attribute="value">');
	});

	it('should use number scope', () => {
		const actual = render(
			{ attribute: [''], '': ['tag', 'number'] },
			{ number: 0 }
		);

		expect(actual).toBe('<tag attribute="0">');
	});

	it('should render content', () => {
		const actual = render(
			{ '': ['outer', '', [
				'static',
				{ attribute: 'value', '': ['inner']},
				['string']
			]] },
			{ string: 'dynamic' }
		);

		expect(actual).toBe(
			'<outer>static<inner attribute="value">dynamic</outer>'
		);
	});
});
