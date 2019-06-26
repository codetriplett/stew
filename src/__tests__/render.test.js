import { render } from '../render';

describe('render', () => {
	it('should render container tag', () => {
		const actual = render(['(', 'string', ')'], { string: 'value' });
		expect(actual).toBe('(value)');
	});

	it('should render container tag', () => {
		const actual = render({ attribute: ['value'], '': ['tag', '', []] });
		expect(actual).toBe('<tag attribute="value"></tag>');
	});

	it('should render self closing tag', () => {
		const actual = render({ attribute: ['value'], '': ['tag', ''] });
		expect(actual).toBe('<tag attribute="value">');
	});

	it('should render children', () => {
		const actual = render({ attribute: ['value'], '': ['tag', '', [
			{ first: ['alpha'], '': ['one', ''] },
			{ second: ['beta'], '': ['two', ''] }
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
			{ attribute: ['^', 'string', '$'], '': ['tag', ''] },
			{ string: 'value' }
		);
		expect(actual).toBe('<tag attribute="^value$">');
	});

	it('should set new scope', () => {
		const actual = render(
			{ attribute: ['', 'keep', '-', 'update'], '': ['tag', 'object'] },
			{ keep: 'upper', update: 'upper', object: { update: 'lower' } }
		);
		expect(actual).toBe('<tag attribute="upper-lower">');
	});

	it('should use scope as content', () => {
		const actual = render(
			{ '': ['tag', 'string', []] },
			{ string: 'value' }
		);

		expect(actual).toBe('<tag>value</tag>');
	});

	it('should not render if scope is empty', () => {
		const actual = render(
			{ attribute: ['', 'missing'], '': ['tag', 'object'] },
			{ string: 'value' }
		);
		expect(actual).toBe('');
	});

	it('should not render if scope is empty', () => {
		const actual = render(
			{ attribute: ['', 'missing'], '': ['tag', 'object'] },
			{ string: 'value' }
		);
		expect(actual).toBe('');
	});

	it('should repeat for each item in array', () => {
		const actual = render(
			{ attribute: ['', 'string'], '': ['tag', 'array'] },
			{ array: [{ string: 'first' }, { string: 'second' }] }
		);
		
		expect(actual).toBe('<tag attribute="first"><tag attribute="second">');
	});
});
