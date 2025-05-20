import parse, { parseInline } from './markdown';

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
			const links = [];
			const actual = parseInline('[Label][key]', ['site'], links);
			const node = ['a', 'key', 'Label'];
			expect(actual).toEqual([node]);
			expect(links).toEqual([node]);
		});
	});
});

describe('parse', () => {
	it('paragraph', () => {
		const actual = parse('Paragraph');

		expect(actual).toEqual(['main', null,
			['p', null, 'Paragraph'],
		]);
	});

	it('paragraph with br', () => {
		const actual = parse('Paragraph\nAdjacent');

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
				['blockquote', null,
					['p', null, 'Item'],
				],
			]);
		});

		it.only('multiple line', () => {
			const actual = parse('> Item\n> Adjacent');

			expect(actual).toEqual(['main', null,
				['blockquote', null,
					['p', null,
						'Item',
						['br'],
						'Adjacent',
					],
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
		it('reset by heading', () => {
			const actual = parse(`
- Item
  - Subitem
# Heading
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						'Item',
						['ul', null,
							['li', null, 'Subitem'],
						],
					],
				],
				[1, null, 'Heading'],
			]);
		});

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
