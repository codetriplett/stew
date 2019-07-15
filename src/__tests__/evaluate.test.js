import { evaluate } from '../evaluate'

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

describe('evaluate', () => {
	describe('string', () => {
		it('should return the string', () => {
			const actual = evaluate(['value'], [{}]);
			expect(actual).toBe('value');
		});
	});

	describe('array', () => {
		describe('generate', () => {
			it('should generate a string', () => {
				const actual = evaluate([['key']], [{ key: 'value' }]);
				expect(actual).toBe('value');
			});
	
			it('should generate a non string', () => {
				const actual = evaluate([['key']], [{ key: () => {} }]);
				expect(actual).toEqual(expect.any(Function));
			});
	
			it('should read from root', () => {
				const actual = evaluate([['.key']], [{}, { key: 'value' }]);
				expect(actual).toBe('value');
			});
	
			it('should ignore a missing variable', () => {
				const actual = evaluate([['key']], [{}]);
				expect(actual).toBeUndefined();
			});
	
			it('should join string and variable', () => {
				const actual = evaluate(
					['(', ['key'], ')'],
					[{ key: 'value' }]
				);

				expect(actual).toBe('(value)');
			});
	
			it('should join variable and string', () => {
				const actual = evaluate([['a'], ':', ['b']], [{ a: 0, b: 1 }]);
				expect(actual).toBe('0:1');
			});
	
			it('should include conditional string', () => {
				const actual = evaluate([['key', 1], 'value'], [{ key: 1 }]);
				expect(actual).toBe('value');
			});
	
			it('should ignore conditional string for different value', () => {
				const actual = evaluate([['key', 1], 'value'], [{ key: 2 }]);
				expect(actual).toBe('');
			});
	
			it('should ignore conditinal string for missing value', () => {
				const actual = evaluate([['key', 1], 'value'], [{}]);
				expect(actual).toBe('');
			});
		});

		describe('extract', () => {
			it('should not extract from a string', () => {
				const actual = evaluate(['value'], {}, 'value');
				expect(actual).toEqual({});
			});
	
			it('should extract to a variable', () => {
				const actual = evaluate([['key']], {}, 'value');
				expect(actual).toEqual({ key: 'value' });
			});
	
			it('should extract to an absolute variable', () => {
				const actual = evaluate([['.key']], {}, 'value');
				expect(actual).toEqual({ key: 'value' });
			});
	
			it('should extract around strings', () => {
				const actual = evaluate(['(', ['key'], ')'], {}, '(value)');
				expect(actual).toEqual({ key: 'value' });
			});
	
			it('should extract between strings', () => {
				const actual = evaluate([['a'], ':', ['b']], {}, '0:1');
				expect(actual).toEqual({ a: 0, b: 1 });
			});
		});
	});

	describe('object', () => {
		describe('generate', () => {
			it('should generate a self closing tag', () => {
				const actual = evaluate(
					{ attribute: 'value', '': ['tag'] }
				);

				expect(actual).toBe('<tag attribute="value">');
			});

			it('should render container tag', () => {
				const actual = evaluate(
					{ attribute: 'value', '': ['tag', ['']] }
				);

				expect(actual).toBe('<tag attribute="value"></tag>');
			});
	
			it('should render dynamic attribute', () => {
				const actual = evaluate(
					{ attribute: ['(', ['string'], ')'], '': ['tag'] },
					[{ string: 'dynamic' }]
				);
		
				expect(actual).toBe('<tag attribute="(dynamic)">');
			});

			it('should render children', () => {
				const actual = evaluate({ '': ['container',
					'static',
					{ attribute: ['(', ['string'], ')'], '': ['tag'] },
					['(', ['string'], ')']
				] }, [{ string: 'dynamic' }]);
		
				expect(actual).toBe([
					'<container>',
						'static',
						'<tag attribute="(dynamic)">',
						'(dynamic)',
					'</container>'
				].join(''));
			});
	
			it('should render scoped children', () => {
				const actual = evaluate({ '': ['container',
					{ attribute: ['(', [''], ')'], '': ['tag missing'] },
					{ attribute: ['(', [''], ')'], '': ['tag string'] },
					{ attribute: ['(', ['value'], ')'], '': ['tag object'] },
					{ attribute: ['(', [''], ')'], '': ['tag empty'] },
					{ attribute: ['(', [''], ')'], '': ['tag array'] },
				] }, [{
					empty: [],
					string: 'string',
					object: { value: 'object' },
					array: ['first', 'second']
				}]);
		
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
			it('should extract from attribute', () => {
				const actual = evaluate(
					{ attribute: [['string']], '': ['div'] },
					{},
					_('tag', { attribute: 'old' })
				);
		
				expect(actual).toEqual({ string: 'old' });
			});
			
			it('should extract from children', () => {
				const element = _('div', {}, [
					_('first'),
					_('hr', { attribute: '(second)' }),
					_('(third)')
				]);

				const actual = evaluate({ '': ['div',
					['static'],
					{ attribute: ['(', ['attribute'], ')'], '': ['hr'] },
					['(', ['content'], ')']
				] }, {}, element);
		
				expect(actual).toEqual({
					attribute: 'second',
					content: 'third'
				});
			});
		});
	});
});
