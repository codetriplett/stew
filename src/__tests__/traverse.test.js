import { traverse } from '../traverse'

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

describe('traverse', () => {
	it('should return a given string', () => {
		const actual = traverse(['value'], [{}]);
		expect(actual).toBe('value');
	});

	it('should join string and variable', () => {
		const actual = traverse(['a:', ['b']], { b: 'beta' });
		expect(actual).toBe('a:beta');
	});

	it('should extract string and variable', () => {
		const object = {};
		const actual = traverse(['a:', ['b']], {}, '', 'a:beta', object);
		
		expect(object).toEqual({ b: 'beta' });
		expect(actual).toBe('a:beta');
	});

	describe('generate', () => {
		it('should generate a self closing tag', () => {
			const actual = traverse(
				{ attribute: 'value', '': ['tag'] }
			);

			expect(actual).toBe('<tag attribute="value">');
		});

		it('should render container tag', () => {
			const actual = traverse(
				{ attribute: 'value', '': ['tag', ['']] }
			);

			expect(actual).toBe('<tag attribute="value"></tag>');
		});

		it('should render dynamic attribute', () => {
			const actual = traverse(
				{ attribute: ['(', ['string'], ')'], '': ['tag'] },
				{ string: 'dynamic' }
			);
	
			expect(actual).toBe('<tag attribute="(dynamic)">');
		});

		it('should use the current index in string', () => {
			const actual = traverse(
				{ '': ['container', { '': ['tag array', [['#']]] }] },
				{ array: [1, 2, 3] }
			);
	
			expect(actual).toBe([
				'<container>',
					'<tag data--="0-0">0</tag>',
					'<tag data--="0-1">1</tag>',
					'<tag data--="0-2">2</tag>',
				'</container>'
			].join(''));
		});

		it('should render children', () => {
			const actual = traverse({ '': ['container',
				'static',
				{ attribute: ['(', ['string'], ')'], '': ['tag'] },
				['(', ['string'], ')']
			] }, { string: 'dynamic' });
	
			expect(actual).toBe([
				'<container>',
					'static',
					'<tag attribute="(dynamic)">',
					'(dynamic)',
				'</container>'
			].join(''));
		});

		it('should render scoped children', () => {
			const actual = traverse({ '': ['container',
				{ attribute: ['(', [''], ')'], '': ['tag missing'] },
				{ attribute: ['(', [''], ')'], '': ['tag string'] },
				{ attribute: ['(', ['value'], ')'], '': ['tag object'] },
				{ attribute: ['(', [''], ')'], '': ['tag empty'] },
				{ attribute: ['(', [''], ')'], '': ['tag array'] },
			] }, {
				empty: [],
				string: 'string',
				object: { value: 'object' },
				array: ['first', 'second']
			});
	
			expect(actual).toBe([
				'<container>',
					'<tag data--="1" attribute="(string)">',
					'<tag data--="2" attribute="(object)">',
					'<tag data--="4-0" attribute="(first)">',
					'<tag data--="4-1" attribute="(second)">',
				'</container>'
			].join(''));
		});
	});

	describe('extract', () => {
		let object;
		
		beforeEach(() => {
			object = {};
		});

		it('should extract from attribute', () => {
			traverse(
				{ attribute: [['string']], '': ['div'] },
				{},
				'',
				_('tag', { attribute: 'old' }),
				object
			);
	
			expect(object).toEqual({ string: 'old' });
		});
		
		it('should extract from children', () => {
			const element = _('div', {}, [
				_('first'),
				_('hr', { attribute: '(second)' }),
				_('(third)')
			]);

			traverse({ '': ['div',
				['static'],
				{ attribute: ['(', ['attribute'], ')'], '': ['hr'] },
				['(', ['content'], ')']
			] }, {}, '', element, object);
	
			expect(object).toEqual({
				attribute: 'second',
				content: 'third'
			});
		});
	});
});
