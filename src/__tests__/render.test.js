import { render } from '../render';

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
			const actual = render({ attribute: 'static', '': ['container', '', [
				'static',
				{ attribute: ['string', '(', ')'], '': ['tag'] },
				['string', '(', ')']
			]] }, { string: 'dynamic' });
	
			expect(actual).toBe([
				'<container attribute="static">',
					'static',
					'<tag attribute="(dynamic)">',
					'(dynamic)',
				'</container>'
			].join(''));
		});
	
		it('should use empty scope', () => {
			const actual = render(
				{ attribute: ['string'], '': ['tag', 'object'] },
				{ string: 'upper' }
			);
	
			expect(actual).toBe('');
		});
	
		it('should use object scope', () => {
			const actual = render(
				{ attribute: ['string'], '': ['tag', 'object'] },
				{ string: 'upper', object: { string: 'lower' } },
				0
			);
	
			expect(actual).toBe('<tag attribute="lower" data-stew="0">');
		});

		// TODO: figure out array scope
	});

	describe('extract', () => {
		it('should extract variable', () => {
			const state = {};
			render(['string', '(', ')'], state, '(dynamic)', '');
			expect(state).toEqual({ string: 'dynamic' });
		});

		it('should extract variable from attribute', () => {
			const element = document.createElement('div');
			const state = {};
	
			element.setAttribute('attribute', 'old');
	
			render(
				{ attribute: ['string'], '': ['tag'] },
				state,
				element,
				''
			);
	
			expect(state).toEqual({ string: 'old' });
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
