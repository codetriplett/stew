import { render } from '../render';

const setAttribute = jest.fn();
const toggleAttribute = jest.fn();
const insertBefore = jest.fn();
const appendChild = jest.fn();
const removeChild = jest.fn();

function _ (string, object, array = []) {
	if (!object) {
		return { nodeValue: string };
	}

	array.forEach((item, i) => item.nextSibling = array[i + 1]);

	return {
		getAttribute: name => object[name],
		hasAttribute: name => object.hasOwnProperty(name),
		tagName: string,
		childNodes: array,
		nodeValue: null,
		setAttribute,
		toggleAttribute,
		insertBefore,
		appendChild,
		removeChild
	};
}

describe('render', () => {
	describe('value', () => {
		it('should render static string', () => {
			const actual = render('static');
			expect(actual).toBe('static');
		});
	
		it('should render dynamic string', () => {
			const actual = render(['string', '(', ')'], { string: 'dynamic' });
			expect(actual).toBe('(dynamic)');
		});

		it('should use a variable directly', () => {
			const actual = render(['number'], { number: 1 });
			expect(actual).toBe(1);
		});

		it('should use a variable directly', () => {
			const actual = render(['', '(', ')'], 'value');
			expect(actual).toBe('(value)');
		});
	});

	describe('generate', () => {
		it('should render self closing tag', () => {
			const actual = render({ attribute: 'value', '': ['tag'] });
			expect(actual).toBe('<tag attribute="value">');
		});

		it('should render container tag', () => {
			const actual = render({ attribute: 'value', '': ['tag', '', []] });
			expect(actual).toBe('<tag attribute="value"></tag>');
		});
	
		it('should render dynamic attribute', () => {
			const actual = render(
				{ attribute: ['string', '(', ')'], '': ['tag'] },
				{ string: 'dynamic' }
			);
	
			expect(actual).toBe('<tag attribute="(dynamic)">');
		});

		it('should render children', () => {
			const actual = render({ '': ['container', '', [
				'static',
				{ attribute: ['string', '(', ')'], '': ['tag'] },
				['string', '(', ')']
			]] }, { string: 'dynamic' });
	
			expect(actual).toBe([
				'<container>',
					'static',
					'<tag attribute="(dynamic)">',
					'(dynamic)',
				'</container>'
			].join(''));
		});
	
		it('should render scoped children', () => {
			const actual = render({ '': ['container', '', [
				{ attribute: ['', '(', ')'], '': ['tag', 'missing'] },
				{ attribute: ['', '(', ')'], '': ['tag', 'string'] },
				{ attribute: ['value', '(', ')'], '': ['tag', 'object'] },
				{ attribute: ['', '(', ')'], '': ['tag', 'empty'] },
				{ attribute: ['', '(', ')'], '': ['tag', 'array'] },
			]] }, {
				empty: [],
				string: 'string',
				object: { value: 'object' },
				array: ['first', 'second']
			});
	
			expect(actual).toBe([
				'<container>',
					'<tag attribute="(string)" data--="1">',
					'<tag attribute="(object)" data--="2">',
					'<tag attribute="(first)" data--="4-0">',
					'<tag attribute="(second)" data--="4-1">',
				'</container>'
			].join(''));
		});
	});

	describe('extract', () => {
		it('should extract from string', () => {
			const element = '(dynamic)';
			const state = {};

			render(['string', '(', ')'], state, element, '');
			expect(state).toEqual({ string: 'dynamic' });
		});

		it('should extract from text node', () => {
			const element = _('(dynamic)');
			const state = {};

			render(['string', '(', ')'], state, element, '');
			expect(state).toEqual({ string: 'dynamic' });
		});

		it('should extract from attribute', () => {
			const element = _('div', { attribute: 'old' });
			const state = {};
	
			render(
				{ attribute: ['string'], '': ['tag'] },
				state, element, ''
			);
	
			expect(state).toEqual({ string: 'old' });
		});

		it('should extract from children', () => {
			const element = _('div', {}, [
				_('static'),
				_('hr', { attribute: '(dynamic)' }),
				_('(dynamic)')
			]);

			const state = {};

			render({ '': ['div', '', [
				'static',
				{ attribute: ['string', '(', ')'], '': ['hr'] },
				['string', '(', ')']
			]] }, state, element, '');
	
			expect(state).toEqual({ string: 'dynamic' });
		});

		it('should extract within scope', () => {
			const element = '(dynamic)';
			const state = {};

			render(['string', '(', ')'], state, element, 'object.');
			expect(state).toEqual({ 'object.string': 'dynamic' });
		});

		it('should extract from scoped children', () => {
			const element = _('div', {}, [
				_('img', { attribute: '(string)', 'data--': '1' }),
				_('img', { attribute: '(object)', 'data--': '2' }),
				_('img', { attribute: '(first)', 'data--': '4-0' }),
				_('img', { attribute: '(second)', 'data--': '4-1' }),
			]);

			const state = {};

			render({ '': ['container', '', [
				{ attribute: ['', '(', ')'], '': ['tag', 'missing'] },
				{ attribute: ['', '(', ')'], '': ['tag', 'value'] },
				{ attribute: ['value', '(', ')'], '': ['tag', 'object'] },
				{ attribute: ['', '(', ')'], '': ['tag', 'empty'] },
				{ attribute: ['', '(', ')'], '': ['tag', 'array'] },
			]] }, state, element);

			expect(state).toEqual({
				value: 'string',
				object: { value: 'object' },
				array: ['first', 'second']
			});
		});
	});

	describe('update', () => {
		it('should update dynamic attribute', () => {
			const element = document.createElement('div');
			element.setAttribute('attribute', 'old');
	
			render(
				{ attribute: ['string'], '': ['tag'] },
				{ string: 'new' },
				element,
				{}
			);
	
			expect(element.getAttribute('attribute')).toBe('new');
		});

		it('should update dynamic content', () => {
			const element = { childNodes: [{ nodeValue: 'old' }] };
	
			render(
				{ '': ['tag', '', [['string']]] },
				{ string: 'new' },
				element,
				{}
			);
	
			expect(element.childNodes[0].nodeValue).toBe('new');
		});
	});
});
