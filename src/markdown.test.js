import parse, { parseInline, finalize } from './markdown';

// TODO: consider simplified syntax after all features are finished to see if it can save on size and complexity
// - only one list symbol per line and blockquotes must also have a space after them to avoid edge case handling (also looks neater)
//   - !!! may not need this 
// - tables must have at least one space in empty cell to set them apart from spoiler tags
// - headlines allowed in list items, but don't lock/unlock scope like ones at root

// TODO: also change the way the layout is build (switching to spaceable, and borrowing previous line is getting complicated)
// - keep [tagName, {}, ...children], but use props to store the spaceable flag, and store each line of inline content in a fragment
// - on final pass, extract children from fragments, and put a br between them, also wrap each chain of fragments in p if spaceable flag is present
// - stack can just hold the container, and indentation can be stored on props as well
// - final pass will recursively process children and replace props with null, except for spoilers and ol with offset start
// - do this after current method is checked so we can compare the diff to see how much lighter the code is
// - also set types so we can avoid doing regex on tagNames: container (main, blockquote, p), list (li, ol, dl)
// - lists process fragments of their children content instead of the lists direct content (maybe this can just be a boolean prop isList)
// - no longer need to store links and lists in Sets to process later, recursion will pick up on these (e.g. does link have href or key)

// try to keep markdown to 25% of total bundle size, webgl to 25%, and the rest to the core functionality

describe('parseInline', () => {
	it('spoiler tag', () => {
		const actual = parseInline('||Item||');

		expect(actual).toEqual([
			['span', {
				onclick: {
					style: {
						color: 'transparent',
					},
				},
			}, 'Item']
		]);
	});

	describe('links', () => {
		it('relative', () => {
			const actual = parseInline('[Label](/path)');

			expect(actual).toEqual([
				['a', { href: '/path' }, 'Label']
			]);
		});

		it('absolute', () => {
			const actual = parseInline('[Label](http://www.domain.com/path)');

			expect(actual).toEqual([
				['a', { href: 'http://www.domain.com/path' }, 'Label']
			]);
		});

		it('dotted', () => {
			const actual = parseInline('[Label](./path)', ['site', 'category', 'other']);

			expect(actual).toEqual([
				['a', { href: '/site/category/path' }, 'Label']
			]);
		});

		it('backtrack', () => {
			const actual = parseInline('[Label](../path)', ['site', 'category', 'other']);

			expect(actual).toEqual([
				['a', { href: '/site/path' }, 'Label']
			]);
		});

		it('title double quotes', () => {
			const actual = parseInline('[Label](/path "Title")');

			expect(actual).toEqual([
				['a', { href: '/path', title: 'Title' }, 'Label']
			]);
		});

		it('title single quotes', () => {
			const actual = parseInline('[Label](/path \'Title\')');

			expect(actual).toEqual([
				['a', { href: '/path', title: 'Title' }, 'Label']
			]);
		});

		it('reference', () => {
			const links = new Set();
			const actual = parseInline('[Label][key]', ['site'], links);
			const node = ['a', 'key', 'Label'];
			expect(actual).toEqual([node]);
			expect(links).toEqual(new Set([node]));
		});
	});
});

// describe('parseNesting', () => {
// 	it('none', () => {
// 		const stack = [
// 			['main', {}],
// 		];

// 		const actual = parseNesting('', stack);
// 		expect(stack).toHaveLength(1);
// 		expect(actual).toEqual([]);
// 	});
	
// 	it('extra whitespace', () => {
// 		const stack = [
// 			['main', {}],
// 		];

// 		const actual = parseNesting('    ', stack);
// 		expect(stack[0][1].padding).toEqual('');
// 		expect(stack).toHaveLength(1);
// 		expect(actual).toEqual([]);
// 	});

// 	describe('definition list', () => {
// 		it.only('created', () => {
// 			// symbols, list, stackLength, initialStack
// 			const actual = testNesting(': ', 1, ['dl', null,
// 				['dt', null, 'Item'],
// 			],
// 				['main', null, ['', null, 'Item']],
// 			);
			
// 			expect(actual).toEqual([
// 				['dl', null, ['dt', null, 'Item']],
// 				['dd', props],
// 			]);




// 			const stack = [
// 				['main', {}, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting(': ', stack);
// 			const props = { spaced: false, indentation: 2, wrapper: actual[0] };
// 			expect(stack[0]).toEqual(['main', {}]);
// 			expect(stack).toHaveLength(1);

// 			expect(actual).toEqual([
// 				['dl', null, ['dt', null, 'Item']],
// 				['dd', props],
// 			]);
// 		});

// 		// TODO: consider adding wrappers to stack instead
// 		// - its content will be stored in a final item in the finalization step
// 		// - include a prop to store any of its children that have been completed
// 		// - store a subtype and items array
// 		it('extended', () => {


// 			const wrapper = ['ul', null,
// 				['dt', null],
// 			];

// 			const stack = [
// 				['main', {}],
// 				['dd', { spaced: false, indentation: 2, wrapper }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting(': ', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);

// 			const expected = buildExpected('dd', { spaced: false, indentation, wrapper },
// 				[['', null, 'Item']]
// 			);

// 			expect(stack[stack.length - 1]).toEqual(expected);

// 			expect(wrapper).toEqual(['ul', null,
// 				['dd']
// 			]);
// 		});
		
// 		it('nested', () => {
// 			const stack = [
// 				['main', {}],
// 				['dd', { spaced: false, indentation: 2, wrapper: ['dl', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('  : ', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual[0]).not.toBe(stack[1]);

// 			expect(actual).toEqual([
// 				['dd', { spaced: false, indentation: 4, wrapper: ['dl', null,
// 					['dt', null, 'Item']
// 				] }],
// 			]);
// 		});

// 		it('no whitespace', () => {
// 			const stack = [
// 				['main', {}],
// 				['dd', { spaced: false, indentation: 2, wrapper: ['dl', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting(':', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				indentation: 2,
// 				wrapper: ['dl', null,
// 					['dd', null, ['', null, 'Item']],
// 				],
// 			});
// 		});

// 		it('extra whitespace', () => {
// 			const stack = [
// 				['main', {}],
// 				['dd', { spaced: false, indentation: 2, wrapper: ['dl', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting(':     ', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				indentation: 2,
// 				padding: '',
// 				wrapper: ['dl', null,
// 					['dd', null, ['', null, 'Item']],
// 				],
// 			});
// 		});
// 	});

// 	describe('unordered list', () => {
// 		it('created', () => {
// 			const stack = [
// 				['main', {}],
// 			];

// 			const actual = parseNesting('- ', stack);
// 			expect(stack).toHaveLength(1);

// 			expect(actual).toEqual([
// 				['li', { spaced: false, indentation: 2, wrapper: ['ul', null] }],
// 			]);
// 		});

// 		it('extended', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 2, wrapper: ['ul', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('- ', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				indentation: 2,
// 				wrapper: ['ul', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});
		
// 		it('nested', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 2, wrapper: ['ul', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('  - ', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual[0]).not.toBe(stack[1]);

// 			expect(actual).toEqual([
// 				['li', { spaced: false, indentation: 4, wrapper: ['ul', null] }],
// 			]);
// 		});
		
// 		it('extended nested', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 2, wrapper: ['ul', null] }],
// 				['li', { spaced: false, indentation: 4, wrapper: ['ul', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('  - ', stack);
// 			expect(stack).toHaveLength(3);
// 			expect(actual[0]).not.toBe(stack[2]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				indentation: 4,
// 				wrapper: ['ul', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});
		
// 		it('nested inline', () => {
// 			const stack = [
// 				['main', {}],
// 			];

// 			const actual = parseNesting('- - ', stack);
// 			expect(stack).toHaveLength(1);

// 			expect(actual).toEqual([
// 				['li', { spaced: false, indentation: 2, wrapper: ['ul', null] }],
// 				['li', { spaced: false, indentation: 4, wrapper: ['ul', null] }],
// 			]);
// 		});

// 		it('end previous', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 3, wrapper: ['ol', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('- ', stack);
// 			expect(stack).toHaveLength(1);

// 			expect(actual).toEqual([
// 				['li', { spaced: false, indentation: 2, wrapper: ['ul', null] }],
// 			]);
// 		});

// 		it('extended lazy', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 2, wrapper: ['ul', null] }],
// 			];

// 			const actual = parseNesting('', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);
// 		});

// 		it('spaced', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 2, wrapper: ['ul', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('- ', stack, true);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				spaced: true,
// 				indentation: 2,
// 				wrapper: ['ul', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});

// 		it('maintains spaced', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: true, indentation: 2, wrapper: ['ul', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('- ', stack, false);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				spaced: true,
// 				indentation: 2,
// 				wrapper: ['ul', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});
		
// 		it('spaced inline', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 2, wrapper: ['ul', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('- - ', stack);
// 			expect(stack).toHaveLength(2);

// 			expect(actual).toEqual([
// 				['li', { spaced: false, indentation: 4, wrapper: ['ul', null] }],
// 			]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				indentation: 2,
// 				wrapper: ['ul', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});

// 		it('no whitespace', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 2, wrapper: ['ul', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('-', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				indentation: 2,
// 				wrapper: ['ul', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});

// 		it('extra whitespace', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 2, wrapper: ['ul', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('-     ', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				indentation: 2,
// 				padding: '',
// 				wrapper: ['ul', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});
// 	});

// 	describe('ordered list', () => {
// 		it('created', () => {
// 			const stack = [
// 				['main', {}],
// 			];

// 			const actual = parseNesting('1. ', stack);
// 			expect(stack).toHaveLength(1);

// 			expect(actual).toEqual([
// 				['li', { spaced: false, indentation: 3, wrapper: ['ol', null] }],
// 			]);
// 		});

// 		it('extended', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 3, wrapper: ['ol', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('1. ', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				indentation: 3,
// 				wrapper: ['ol', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});
		
// 		it('nested', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 3, wrapper: ['ol', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('   1. ', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual[0]).not.toBe(stack[1]);

// 			expect(actual).toEqual([
// 				['li', { spaced: false, indentation: 6, wrapper: ['ol', null] }],
// 			]);
// 		});
		
// 		it('extended nested', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 3, wrapper: ['ol', null] }],
// 				['li', { spaced: false, indentation: 6, wrapper: ['ol', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('   1. ', stack);
// 			expect(stack).toHaveLength(3);
// 			expect(actual[0]).not.toBe(stack[2]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				indentation: 6,
// 				wrapper: ['ol', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});
		
// 		it('nested inline', () => {
// 			const stack = [
// 				['main', {}],
// 			];

// 			const actual = parseNesting('1. 1. ', stack);
// 			expect(stack).toHaveLength(1);

// 			expect(actual).toEqual([
// 				['li', { spaced: false, indentation: 3, wrapper: ['ol', null] }],
// 				['li', { spaced: false, indentation: 6, wrapper: ['ol', null] }],
// 			]);
// 		});

// 		it('end previous', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 2, wrapper: ['ul', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('1. ', stack);
// 			expect(stack).toHaveLength(1);

// 			expect(actual).toEqual([
// 				['li', { spaced: false, indentation: 3, wrapper: ['ol', null] }],
// 			]);
// 		});

// 		it('extended lazy', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 3, wrapper: ['ol', null] }],
// 			];

// 			const actual = parseNesting('', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);
// 		});

// 		it('spaced', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 3, wrapper: ['ol', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('1. ', stack, true);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				spaced: true,
// 				indentation: 3,
// 				wrapper: ['ol', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});

// 		it('maintains spaced', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: true, indentation: 3, wrapper: ['ol', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('1. ', stack, false);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				spaced: true,
// 				indentation: 3,
// 				wrapper: ['ol', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});
		
// 		it('spaced inline', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 3, wrapper: ['ol', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('1. 1. ', stack);
// 			expect(stack).toHaveLength(2);

// 			expect(actual).toEqual([
// 				['li', { spaced: false, indentation: 6, wrapper: ['ol', null] }],
// 			]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				indentation: 3,
// 				wrapper: ['ol', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});

// 		it('no whitespace', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 3, wrapper: ['ol', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('1.', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				indentation: 3,
// 				wrapper: ['ol', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});

// 		it('extra whitespace', () => {
// 			const stack = [
// 				['main', {}],
// 				['li', { spaced: false, indentation: 3, wrapper: ['ol', null] }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('1.     ', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);

// 			expect(stack[stack.length - 1][1]).toMatchObject({
// 				indentation: 3,
// 				padding: '',
// 				wrapper: ['ol', null,
// 					['li', null, ['', null, 'Item']],
// 				],
// 			});
// 		});
// 	});

// 	describe('blockquote', () => {
// 		it('created', () => {
// 			const stack = [
// 				['main', {}],
// 			];

// 			const actual = parseNesting('> ', stack);
// 			expect(stack).toHaveLength(1);

// 			expect(actual).toEqual([
// 				['blockquote', { spaced: false, indentation: 2 }],
// 			]);
// 		});

// 		it('extended', () => {
// 			const stack = [
// 				['main', {}],
// 				['blockquote', { spaced: false, indentation: 2 }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('> ', stack);
// 			expect(stack).toHaveLength(2);
// 			expect(actual).toEqual([]);
// 		});

// 		it('nested', () => {
// 			const stack = [
// 				['main', {}],
// 				['blockquote', { spaced: false, indentation: 2 }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('>> ', stack);
// 			expect(stack).toHaveLength(2);

// 			expect(actual).toEqual([
// 				['blockquote', { spaced: false, indentation: 3 }],
// 			]);
// 		});

// 		it('nested wide', () => {
// 			const stack = [
// 				['main', {}],
// 				['blockquote', { spaced: false, indentation: 2 }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('>    > ', stack);
// 			expect(stack).toHaveLength(2);

// 			expect(actual).toEqual([
// 				['blockquote', { spaced: false, indentation: 3 }],
// 			]);
// 		});

// 		it('lazy', () => {
// 			const stack = [
// 				['main', {}],
// 				['blockquote', { spaced: false, indentation: 2 }, ['', null, 'Item']],
// 				['blockquote', { spaced: false, indentation: 3 }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('> ', stack);
// 			expect(stack).toHaveLength(3);
// 			expect(actual).toEqual([]);
// 		});

// 		it('extra lazy', () => {
// 			const stack = [
// 				['main', {}],
// 				['blockquote', { spaced: false, indentation: 2 }, ['', null, 'Item']],
// 				['blockquote', { spaced: false, indentation: 3 }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('', stack);
// 			expect(stack).toHaveLength(3);
// 			expect(actual).toEqual([]);
// 		});

// 		it('space interrupt', () => {
// 			const stack = [
// 				['main', {}],
// 				['blockquote', { spaced: false, indentation: 2 }, ['', null, 'Item']],
// 			];

// 			const actual = parseNesting('> ', stack, true);
// 			expect(stack).toHaveLength(1);

// 			expect(actual).toEqual([
// 				['blockquote', { spaced: false, indentation: 2 }],
// 			]);
// 		});

// 		it('no whitespace', () => {
// 			const stack = [
// 				['main', {}],
// 			];

// 			const actual = parseNesting('>', stack);
// 			expect(stack).toHaveLength(1);

// 			expect(actual).toEqual([
// 				['blockquote', { spaced: false, indentation: 2 }],
// 			]);
// 		});

// 		it('extra whitespace', () => {
// 			const stack = [
// 				['main', {}],
// 			];

// 			const actual = parseNesting('>     ', stack);
// 			expect(stack).toHaveLength(1);

// 			expect(actual).toEqual([
// 				['blockquote', { spaced: false, indentation: 2, padding: '' }],
// 			]);
// 		});
// 	});
// });

describe.only('parse', () => {
	it('paragraph', () => {
		const actual = parse('Paragraph');

		expect(actual).toEqual(['main', null,
			['p', null, 'Paragraph'],
		]);
	});

	it('paragraph with br', () => {
		const actual = parse('Paragraph  \nAdjacent');

		expect(actual).toEqual(['main', null,
			['p', null, 'Paragraph', ['br'], 'Adjacent'],
		]);
	});

	it('paragraph separate', () => {
		const actual = parse('Paragraph\n\nAdjacent');

		expect(actual).toEqual(['main', null,
			['p', null, 'Paragraph'],
			['p', null, 'Adjacent'],
		]);
	});
	
	it('hash tag', () => {
		const actual = parse('#lmno');

		expect(actual).toEqual(['main', null,
			['p', null, '#lmno'],
		]);
	});

	describe('heading', () => {
		it('heading primary', () => {
			const actual = parse('Heading\n===');

			expect(actual).toEqual(['main', null,
				[1, null, 'Heading'],
			]);
		});

		it('heading secondary', () => {
			const actual = parse('Heading\n---');

			expect(actual).toEqual(['main', null,
				[2, null, 'Heading'],
			]);
		});
		
		it('one hash', () => {
			const actual = parse('# Heading');

			expect(actual).toEqual(['main', null,
				[1, null, 'Heading'],
			]);
		});
		
		it('six hashes', () => {
			const actual = parse('###### Heading');

			expect(actual).toEqual(['main', null,
				[6, null, 'Heading'],
			]);
		});
		
		it('with link', () => {
			const actual = parse('# Heading #lmno');

			expect(actual).toEqual(['main', null,
				[1, { id: 'lmno' },
					['a', { href: '#lmno' }, 'Heading'],
				],
			]);
		});
		
		it('extra hashes', () => {
			const actual = parse('####### Heading');

			expect(actual).toEqual(['main', null,
				['p', null, '####### Heading'],
			]);
		});
	});

	describe('preformatted', () => {
		it('tab indentation', () => {
			const actual = parse('\tabc');

			expect(actual).toEqual(['main', null,
				['pre', null,
					['code', null, 'abc'],
				],
			]);
		});

		it('space indentation', () => {
			const actual = parse('    abc');

			expect(actual).toEqual(['main', null,
				['pre', null,
					['code', null, 'abc'],
				],
			]);
		});

		it('multiple lines', () => {
			const actual = parse('\tabc\n\txyz');

			expect(actual).toEqual(['main', null,
				['pre', null,
					['code', null, 'abc\nxyz'],
				],
			]);
		});

		it('several newlines', () => {
			const actual = parse('\tabc\n\n\n\txyz');

			expect(actual).toEqual(['main', null,
				['pre', null,
					['code', null, 'abc\n\n\nxyz'],
				],
			]);
		});

		it('tick wrapped', () => {
			const actual = parse('```\nabc\n```');

			expect(actual).toEqual(['main', null,
				['pre', null,
					['code', null, 'abc'],
				],
			]);
		});

		it('nested ticks', () => {
			const actual = parse('````\n```\nabc\n```\n````');

			expect(actual).toEqual(['main', null,
				['pre', null,
					['code', null, '```\nabc\n```'],
				],
			]);
		});

		it.skip('interrupts nesting', () => {
			const actual = parse('    - abc');

			expect(actual).toEqual(['main', null,
				['pre', null,
					['code', null, '- abc'],
				],
			]);
		});
	});

	describe('list', () => {
		it('unordered', () => {
			const actual = parse('- Item');

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null, 'Item'],
				],
			]);
		});

		it('multiple items', () => {
			const actual = parse('- Item\n- Adjacent');

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null, 'Item'],
					['li', null, 'Adjacent'],
				],
			]);
		});

		it('empty item', () => {
			const actual = parse('-');

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null],
				],
			]);
		});

		it('nested inline', () => {
			const actual = parse('- - Item');

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						['ul', null,
							['li', null, 'Item'],
						],
					],
				],
			]);
		});

		it('nested ordered inline', () => {
			const actual = parse('2. - Item');

			expect(actual).toEqual(['main', null,
				['ol', { start: '2' },
					['li', null,
						['ul', null,
							['li', null, 'Item'],
						],
					],
				],
			]);
		});

		it('spaced items', () => {
			const actual = parse('- Item\n\n- Adjacent');

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						['p', null, 'Item'],
					],
					['li', null,
						['p', null, 'Adjacent'],
					],
				],
			]);
		});

		it('wrapped line', () => {
			const actual = parse(`
- Item
  Adjacent
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						'Item', 'Adjacent',
					],
				],
			]);
		});

		it('line break', () => {
			const actual = parse(`
- Item  
  Adjacent
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						'Item',
						['br'],
						'Adjacent',
					],
				],
			]);
		});

		it('spaced paragraph', () => {
			const actual = parse(`
- Item

  Adjacent
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						['p', null, 'Item'],
						['p', null, 'Adjacent'],
					],
				],
			]);
		});

		it('spaced paragraph and items', () => {
			const actual = parse(`
- Item

  Adjacent
- Sibling
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						['p', null, 'Item'],
						['p', null, 'Adjacent'],
					],
					['li', null,
						['p', null, 'Sibling'],
					],
				],
			]);
		});

		it('separated', () => {
			const actual = parse('- Item\n\n\n- Adjacent');

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null, 'Item'],
				],
				['ul', null,
					['li', null, 'Adjacent'],
				],
			]);
		});

		it('ordered', () => {
			const actual = parse('1. Item\n2. Adjacent');

			expect(actual).toEqual(['main', null,
				['ol', null,
					['li', null, 'Item'],
					['li', null, 'Adjacent'],
				],
			]);
		});

		it('offset start', () => {
			const actual = parse('2. Item\n3. Adjacent');

			expect(actual).toEqual(['main', null,
				['ol', { start: '2' },
					['li', null, 'Item'],
					['li', null, 'Adjacent'],
				],
			]);
		});

		it('mixed', () => {
			const actual = parse('- Item\n\n1. Adjacent');

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null, 'Item'],
				],
				['ol', null,
					['li', null, 'Adjacent'],
				],
			]);
		});

		it('nested', () => {
			const actual = parse('- Item\n  - Child');

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						'Item',
						['ul', null,
							['li', null, 'Child'],
						],
					],
				],
			]);
		});

		it('nested with spacing', () => {
			const actual = parse(`
- Item

  - Subitem
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						['p', null, 'Item'],
						['ul', null,
							['li', null, 'Subitem'],
						],
					],
				],
			]);
		});
		
		it('definition list', () => {
			const actual = parse('Item\n: Child');

			expect(actual).toEqual(['main', null,
				['dl', null,
					['dt', null, 'Item'],
					['dd', null, 'Child'],
				],
			]);
		});
		
		it('definition multiple', () => {
			const actual = parse('Item\n: Child\n: Adjacent');

			expect(actual).toEqual(['main', null,
				['dl', null,
					['dt', null, 'Item'],
					['dd', null, 'Child'],
					['dd', null, 'Adjacent'],
				],
			]);
		});
		
		it('definition spaced', () => {
			const actual = parse('Item\n\n: Child\n\n: Adjacent');

			expect(actual).toEqual(['main', null,
				['dl', null,
					['dt', null, 'Item'],
					['dd', null,
						['p', null, 'Child'],
					],
					['dd', null,
						['p', null, 'Adjacent'],
					],
				],
			]);
		});
	});

	describe('blockquote', () => {
		it('single line', () => {
			const actual = parse('> Item');

			expect(actual).toEqual(['main', null,
				['blockquote', null, 'Item'],
			]);
		});

		it('wrapped lines', () => {
			const actual = parse('> Item\n> Adjacent');

			expect(actual).toEqual(['main', null,
				['blockquote', null,
					'Item', 'Adjacent',
				],
			]);
		});

		it('multiple lines', () => {
			const actual = parse('> Item  \n> Adjacent');

			expect(actual).toEqual(['main', null,
				['blockquote', null,
					'Item',
					['br'],
					'Adjacent',
				],
			]);
		});
	});

	describe('table', () => {
		it('cell', () => {
			const actual = parse('|Item|');

			expect(actual).toEqual(['main', null,
				['table', null,
					['tbody', null,
						['tr', null,
							['td', null, 'Item'],
						],
					],
				],
			]);
		});

		it('grid', () => {
			const actual = parse('|1|2|3|\n|A|B|C|');

			expect(actual).toEqual(['main', null,
				['table', null,
					['tbody', null,
						['tr', null,
							['td', null, '1'],
							['td', null, '2'],
							['td', null, '3'],
						],
						['tr', null,
							['td', null, 'A'],
							['td', null, 'B'],
							['td', null, 'C'],
						],
					],
				],
			]);
		});

		it('with alignment', () => {
			const actual = parse('|---|:-:|--:|\n|1|2|3|\n|A|B|C|');

			expect(actual).toEqual(['main', null,
				['table', null,
					['tbody', null,
						['tr', null,
							['td', null, '1'],
							['td', { style: { textAlign: 'center' } }, '2'],
							['td', { style: { textAlign: 'right' } }, '3'],
						],
						['tr', null,
							['td', null, 'A'],
							['td', { style: { textAlign: 'center' } }, 'B'],
							['td', { style: { textAlign: 'right' } }, 'C'],
						],
					],
				],
			]);
		});

		it('with header', () => {
			const actual = parse('|L|C|R|\n|---|:-:|--:|\n|1|2|3|\n|A|B|C|');

			expect(actual).toEqual(['main', null,
				['table', null,
					['thead', null,
						['tr', null,
							['th', null, 'L'],
							['th', { style: { textAlign: 'center' } }, 'C'],
							['th', { style: { textAlign: 'right' } }, 'R'],
						],
					],
					['tbody', null,
						['tr', null,
							['td', null, '1'],
							['td', { style: { textAlign: 'center' } }, '2'],
							['td', { style: { textAlign: 'right' } }, '3'],
						],
						['tr', null,
							['td', null, 'A'],
							['td', { style: { textAlign: 'center' } }, 'B'],
							['td', { style: { textAlign: 'right' } }, 'C'],
						],
					],
				],
			]);
		});

		it('with multple alignments', () => {
			const actual = parse('|---|:-:|--:|\n|1|2|3|\n|:-:|--:|---|\n|A|B|C|');

			expect(actual).toEqual(['main', null,
				['table', null,
					['tbody', null,
						['tr', null,
							['td', null, '1'],
							['td', { style: { textAlign: 'center' } }, '2'],
							['td', { style: { textAlign: 'right' } }, '3'],
						],
						['tr', null,
							['td', { style: { textAlign: 'center' } }, 'A'],
							['td', { style: { textAlign: 'right' } }, 'B'],
							['td', null, 'C'],
						],
					],
				],
			]);
		});

		it('ignores spoiler', () => {
			const actual = parse('||Item||');

			expect(actual).toEqual(['main', null,
				['p', null,
					['span', {
						onclick: {
							style: {
								color: 'transparent',
							},
						},
					}, 'Item'],
				],
			]);
		});
	});

	describe('link references', () => {
		it('upper definition', () => {
			const actual = parse('[key]: /path\n[Item][key]');

			expect(actual).toEqual(['main', null,
				['p', null,
					['a', { href: '/path' }, 'Item'],
				],
			]);
		});

		it('upper definition', () => {
			const actual = parse('[Item][key]\n[key]: /path');

			expect(actual).toEqual(['main', null,
				['p', null,
					['a', { href: '/path' }, 'Item'],
				],
			]);
		});
	});

	describe('indentation', () => {
		it('reset by extra newline', () => {
			const actual = parse(`
- Item


- Adjacent
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null, 'Item'],
				],
				['ul', null,
					['li', null, 'Adjacent'],
				],
			]);
		});
	});

	describe('scopes', () => {
		it('summary', () => {
			const actual = parse(`
Summary
# Heading
Paragraph
## Abc #abc
Abc
## Lmno #lmno
Lmno
## Xyz #xyz
Xyz
			`, '/path#');

			expect(actual).toEqual(['main', null,
				['p', null, 'Summary'],
			]);
		});

		it('single', () => {
			const actual = parse(`
Summary
# Heading
Paragraph
## Abc #abc
Abc
## Lmno #lmno
Lmno
## Xyz #xyz
Xyz
			`, '/path#lmno');

			expect(actual).toEqual(['main', null,
				[2, { id: 'lmno' },
					['a', { href: '/path#lmno' }, 'Lmno'],
				],
				['p', null, 'Lmno'],
			]);
		});

		it('single and summary', () => {
			const actual = parse(`
Summary
# Heading
Paragraph
## Abc #abc
Abc
## Lmno #lmno
Lmno
## Xyz #xyz
Xyz
			`, '/path#lmno#');

			expect(actual).toEqual(['main', null,
				['p', null, 'Summary'],
				[2, { id: 'lmno' },
					['a', { href: '/path#lmno' }, 'Lmno'],
				],
				['p', null, 'Lmno'],
			]);
		});

		it('multiple', () => {
			const actual = parse(`
Summary
# Heading
Paragraph
## Abc #abc
Abc
## Lmno #lmno
Lmno
## Xyz #xyz
Xyz
			`, '/path#abc#xyz');

			expect(actual).toEqual(['main', null,
				[2, { id: 'abc' },
					['a', { href: '/path#abc' }, 'Abc'],
				],
				['p', null, 'Abc'],
				[2, { id: 'xyz' },
					['a', { href: '/path#xyz' }, 'Xyz'],
				],
				['p', null, 'Xyz'],
			]);
		});
	});
});

// statements: line prefix
// expressions: within text on line
// list: wrap around statements (sets indentation based on spaces before first character in text)
// - put all content that has the same indentation level within the list item
// - also include paragraph content that is directly below li as content for li, regardless of indentation
// - lis that exist at the parent's indentation will be nested as well
