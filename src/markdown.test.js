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

		expect(actual).toEqual(['main', {},
			['p', {}, 'Paragraph'],
		]);
	});

	it('paragraph with br', () => {
		const actual = parse('Paragraph\nAdjacent');

		expect(actual).toEqual(['main', {},
			['p', {}, 'Paragraph', ['br'], 'Adjacent'],
		]);
	});

	it('paragraph separate', () => {
		const actual = parse('Paragraph\n\nAdjacent');

		expect(actual).toEqual(['main', {},
			['p', {}, 'Paragraph'],
			['p', {}, 'Adjacent'],
		]);
	});
	
	it('hash tag', () => {
		const actual = parse('#lmno');

		expect(actual).toEqual(['main', {},
			['p', {}, '#lmno'],
		]);
	});

	describe('heading', () => {
		it('heading primary', () => {
			const actual = parse('Heading\n===');

			expect(actual).toEqual(['main', {},
				[1, {}, 'Heading'],
			]);
		});

		it('heading secondary', () => {
			const actual = parse('Heading\n---');

			expect(actual).toEqual(['main', {},
				[2, {}, 'Heading'],
			]);
		});
		
		it('one hash', () => {
			const actual = parse('# Heading');

			expect(actual).toEqual(['main', {},
				[1, {}, 'Heading'],
			]);
		});
		
		it('six hashes', () => {
			const actual = parse('###### Heading');

			expect(actual).toEqual(['main', {},
				[6, {}, 'Heading'],
			]);
		});
		
		it('with link', () => {
			const actual = parse('# Heading #lmno');

			expect(actual).toEqual(['main', {},
				[1, { id: 'lmno' },
					['a', { href: '#lmno' }, 'Heading'],
				],
			]);
		});
		
		it('extra hashes', () => {
			const actual = parse('####### Heading');

			expect(actual).toEqual(['main', {},
				['p', {}, '####### Heading'],
			]);
		});
	});

	describe('preformatted', () => {
		it('tab indentation', () => {
			const actual = parse('\tabc');

			expect(actual).toEqual(['main', {},
				['pre', {},
					['code', {}, 'abc'],
				],
			]);
		});

		it('space indentation', () => {
			const actual = parse('    abc');

			expect(actual).toEqual(['main', {},
				['pre', {},
					['code', {}, 'abc'],
				],
			]);
		});

		it('multiple lines', () => {
			const actual = parse('\tabc\n\txyz');

			expect(actual).toEqual(['main', {},
				['pre', {},
					['code', {}, 'abc\nxyz'],
				],
			]);
		});

		it('several newlines', () => {
			const actual = parse('\tabc\n\n\n\txyz');

			expect(actual).toEqual(['main', {},
				['pre', {},
					['code', {}, 'abc\n\n\nxyz'],
				],
			]);
		});

		it('tick wrapped', () => {
			const actual = parse('```\nabc\n```');

			expect(actual).toEqual(['main', {},
				['pre', {},
					['code', {}, 'abc'],
				],
			]);
		});

		it('nested ticks', () => {
			const actual = parse('````\n```\nabc\n```\n````');

			expect(actual).toEqual(['main', {},
				['pre', {},
					['code', {}, '```\nabc\n```'],
				],
			]);
		});
	});

	describe('list', () => {
		it('unordered', () => {
			const actual = parse('- Item');

			expect(actual).toEqual(['main', {},
				['ul', {},
					['li', {}, 'Item'],
				],
			]);
		});

		it('multiple items', () => {
			const actual = parse('- Item\n- Adjacent');

			expect(actual).toEqual(['main', {},
				['ul', {},
					['li', {}, 'Item'],
					['li', {}, 'Adjacent'],
				],
			]);
		});

		it('in paragraphs', () => {
			const actual = parse('- Item\n\n- Adjacent');

			expect(actual).toEqual(['main', {},
				['ul', {},
					['li', {},
						['p', {}, 'Item'],
					],
					['li', {},
						['p', {}, 'Adjacent'],
					],
				],
			]);
		});

		it('separated', () => {
			const actual = parse('- Item\n\n\n- Adjacent');

			expect(actual).toEqual(['main', {},
				['ul', {},
					['li', {}, 'Item'],
				],
				['ul', {},
					['li', {}, 'Adjacent'],
				],
			]);
		});

		it('ordered', () => {
			const actual = parse('1. Item\n2. Adjacent');

			expect(actual).toEqual(['main', {},
				['ol', {},
					['li', {}, 'Item'],
					['li', {}, 'Adjacent'],
				],
			]);
		});

		it('offset start', () => {
			const actual = parse('2. Item\n3. Adjacent');

			expect(actual).toEqual(['main', {},
				['ol', { start: '2' },
					['li', {}, 'Item'],
					['li', {}, 'Adjacent'],
				],
			]);
		});

		it('mixed', () => {
			const actual = parse('- Item\n\n1. Adjacent');

			expect(actual).toEqual(['main', {},
				['ul', {},
					['li', {}, 'Item'],
				],
				['ol', {},
					['li', {}, 'Adjacent'],
				],
			]);
		});

		it('nested', () => {
			const actual = parse('- Item\n  - Child');

			expect(actual).toEqual(['main', {},
				['ul', {},
					['li', {},
						'Item',
						['ul', {},
							['li', {}, 'Child'],
						],
					],
				],
			]);
		});
		
		it('definition list', () => {
			const actual = parse('Item\n: Child');

			expect(actual).toEqual(['main', {},
				['dl', {},
					['dt', {}, 'Item'],
					['dd', {}, 'Child'],
				],
			]);
		});
		
		it('definition multiple', () => {
			const actual = parse('Item\n: Child\n: Adjacent');

			expect(actual).toEqual(['main', {},
				['dl', {},
					['dt', {}, 'Item'],
					['dd', {}, 'Child'],
					['dd', {}, 'Adjacent'],
				],
			]);
		});
		
		it('definition spaced', () => {
			const actual = parse('Item\n\n: Child\n\n: Adjacent');

			expect(actual).toEqual(['main', {},
				['dl', {},
					['dt', {}, 'Item'],
					['dd', {},
						['p', {}, 'Child'],
					],
					['dd', {},
						['p', {}, 'Adjacent'],
					],
				],
			]);
		});
	});

	describe('table', () => {
		it('cell', () => {
			const actual = parse('|Item|');

			expect(actual).toEqual(['main', {},
				['table', {},
					['tbody', {},
						['tr', {},
							['td', {}, 'Item'],
						],
					],
				],
			]);
		});

		it('grid', () => {
			const actual = parse('|1|2|3|\n|A|B|C|');

			expect(actual).toEqual(['main', {},
				['table', {},
					['tbody', {},
						['tr', {},
							['td', {}, '1'],
							['td', {}, '2'],
							['td', {}, '3'],
						],
						['tr', {},
							['td', {}, 'A'],
							['td', {}, 'B'],
							['td', {}, 'C'],
						],
					],
				],
			]);
		});

		it('with alignment', () => {
			const actual = parse('|---|:-:|--:|\n|1|2|3|\n|A|B|C|');

			expect(actual).toEqual(['main', {},
				['table', {},
					['tbody', {},
						['tr', {},
							['td', {}, '1'],
							['td', { style: { textAlign: 'center' } }, '2'],
							['td', { style: { textAlign: 'right' } }, '3'],
						],
						['tr', {},
							['td', {}, 'A'],
							['td', { style: { textAlign: 'center' } }, 'B'],
							['td', { style: { textAlign: 'right' } }, 'C'],
						],
					],
				],
			]);
		});

		it('with header', () => {
			const actual = parse('|L|C|R|\n|---|:-:|--:|\n|1|2|3|\n|A|B|C|');

			expect(actual).toEqual(['main', {},
				['table', {},
					['thead', {},
						['tr', {},
							['th', {}, 'L'],
							['th', { style: { textAlign: 'center' } }, 'C'],
							['th', { style: { textAlign: 'right' } }, 'R'],
						],
					],
					['tbody', {},
						['tr', {},
							['td', {}, '1'],
							['td', { style: { textAlign: 'center' } }, '2'],
							['td', { style: { textAlign: 'right' } }, '3'],
						],
						['tr', {},
							['td', {}, 'A'],
							['td', { style: { textAlign: 'center' } }, 'B'],
							['td', { style: { textAlign: 'right' } }, 'C'],
						],
					],
				],
			]);
		});

		it('with multple alignments', () => {
			const actual = parse('|---|:-:|--:|\n|1|2|3|\n|:-:|--:|---|\n|A|B|C|');

			expect(actual).toEqual(['main', {},
				['table', {},
					['tbody', {},
						['tr', {},
							['td', {}, '1'],
							['td', { style: { textAlign: 'center' } }, '2'],
							['td', { style: { textAlign: 'right' } }, '3'],
						],
						['tr', {},
							['td', { style: { textAlign: 'center' } }, 'A'],
							['td', { style: { textAlign: 'right' } }, 'B'],
							['td', {}, 'C'],
						],
					],
				],
			]);
		});

		it('ignores spoiler', () => {
			const actual = parse('||Item||');

			expect(actual).toEqual(['main', {},
				['p', {},
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

			expect(actual).toEqual(['main', {},
				['p', {},
					['a', { href: '/path' }, 'Item'],
				],
			]);
		});

		it('upper definition', () => {
			const actual = parse('[Item][key]\n[key]: /path');

			expect(actual).toEqual(['main', {},
				['p', {},
					['a', { href: '/path' }, 'Item'],
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

			expect(actual).toEqual(['main', {},
				['p', {}, 'Summary'],
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

			expect(actual).toEqual(['main', {},
				[2, { id: 'lmno' },
					['a', { href: '/path#lmno' }, 'Lmno'],
				],
				['p', {}, 'Lmno'],
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

			expect(actual).toEqual(['main', {},
				['p', {}, 'Summary'],
				[2, { id: 'lmno' },
					['a', { href: '/path#lmno' }, 'Lmno'],
				],
				['p', {}, 'Lmno'],
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

			expect(actual).toEqual(['main', {},
				[2, { id: 'abc' },
					['a', { href: '/path#abc' }, 'Abc'],
				],
				['p', {}, 'Abc'],
				[2, { id: 'xyz' },
					['a', { href: '/path#xyz' }, 'Xyz'],
				],
				['p', {}, 'Xyz'],
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
