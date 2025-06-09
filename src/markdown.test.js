import parse, { parseInline } from './markdown';

let stack, links;

beforeEach(() => {
	stack = [['', null]];
	links = [[]];
});

describe('parseInline', () => {	
	it('adds ndash', () => {
		const actual = parseInline('--', stack);
		expect(actual).toEqual('');
		expect(stack).toEqual([['', null, '&ndash;']]);
	});
	
	it('adds mdash', () => {
		const actual = parseInline('---', stack);
		expect(actual).toEqual('');
		expect(stack).toEqual([['', null, '&mdash;']]);
	});

	it('adds highlight', () => {
		const actual = parseInline('::text::', stack);
		expect(actual).toEqual('');
		expect(stack).toEqual([['', null, ['mark', null, 'text']]]);
	});

	it('adds emoji', () => {
		const actual = parseInline(':smile:', stack, links, { smile: ':)' });
		expect(actual).toEqual('');
		expect(stack).toEqual([['', null, ':)']]);
	});

	it('adds preset', () => {
		const actual = parseInline(':message:', stack, links, { message: ['p', null, 'text'] });
		expect(actual).toEqual('');
		expect(stack).toEqual([['', null, ['p', null, 'text']]]);
	});

	it('continues through pipe', () => {
		const actual = parseInline('text|...', stack);
		expect(actual).toEqual('');
		expect(stack).toEqual([['', null, 'text|...']]);
	});

	it('stops at pipe', () => {
		stack[0][0] = 'td';
		const actual = parseInline('text|...', stack);
		expect(actual).toEqual('...');
		expect(stack).toEqual([['td', null, 'text']]);
	});

	it('continues through spoiler', () => {
		stack[0][0] = 'td';
		const actual = parseInline('text||Item|||...', stack);
		expect(actual).toEqual('...');

		expect(stack).toEqual([['td', null,
			'text',
			['span', {
				style: { color: 'transparent' },
				onclick: {},
			}, 'Item'],
		]]);
	});

	it('spoiler tag', () => {
		const actual = parseInline('||Item||', stack);
		expect(actual).toEqual('');

		expect(stack).toEqual([['', null,
			['span', {
				style: { color: 'transparent' },
				onclick: {},
			}, 'Item']
		]]);
	});

	it('formatted spoiler', () => {
		const actual = parseInline('||*abc ::lmno:: xyz*||', stack);
		expect(actual).toEqual('');

		expect(stack).toEqual([['', null,
			['span', {
				style: { color: 'transparent' },
				onclick: {},
			},
				['em', null,
					'abc ',
					['mark', null, 'lmno'],
					' xyz',
				],
			],
		]]);
	});

	describe('formatted', () => {
		it('em', () => {
			const actual = parseInline('*text*', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['em', null, 'text']]]);
		});

		it('strong', () => {
			const actual = parseInline('**text**', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['strong', null, 'text']]]);
		});

		it('strongem', () => {
			const actual = parseInline('***text***', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['strong', null, ['em', null, 'text']]]]);
		});

		it('emstrong', () => {
			const actual = parseInline('*__text__*', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['em', null, ['strong', null, 'text']]]]);
		});

		it('double in single', () => {
			const actual = parseInline('*abc **lmno** xyz*', stack);
			expect(actual).toEqual('');

			expect(stack).toEqual([['', null,
				['em', null,
					'abc ',
					['strong', null, 'lmno'],
					' xyz',
				],
			]]);
		});

		it('single in double', () => {
			const actual = parseInline('**abc *lmno* xyz**', stack);
			expect(actual).toEqual('');

			expect(stack).toEqual([['', null,
				['strong', null,
					'abc ',
					['em', null, 'lmno'],
					' xyz',
				],
			]]);
		});
		
		it('embedded', () => {
			const actual = parseInline('*[Label](/path)*', stack, links);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['em', null, ['a', { href: '/path' }, 'Label']]]]);
		});
		
		it('strikethrough', () => {
			const actual = parseInline('~text~', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['s', null, 'text']]]);
		});
		
		it('underline', () => {
			const actual = parseInline('~~text~~', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['u', null, 'text']]]);
		});

		it('code', () => {
			const actual = parseInline('`text`', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['code', null, 'text']]]);
		});

		it('deep code', () => {
			const actual = parseInline('``abc `lmno` xyz``', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['code', null, 'abc `lmno` xyz']]]);
		});
	});

	describe('links', () => {
		it('relative', () => {
			const actual = parseInline('[Label](/path)', stack, links);
			expect(actual).toEqual('');

			expect(stack).toEqual([['', null,
				['a', { href: '/path' }, 'Label']
			]]);
		});

		it('image', () => {
			const actual = parseInline('![Label](/path)', stack, links);
			expect(actual).toEqual('');

			expect(stack).toEqual([['', null,
				['img', { href: '/path' }, 'Label']
			]]);
		});

		it('absolute', () => {
			const actual = parseInline('[Label](http://www.domain.com/path)', stack, links);
			expect(actual).toEqual('');

			expect(stack).toEqual([['', null,
				['a', { href: 'http://www.domain.com/path' }, 'Label']
			]]);
		});

		it('dotted', () => {
			links[0] = ['site', 'category', 'other'];
			const actual = parseInline('[Label](./path)', stack, links);
			expect(actual).toEqual('');

			expect(stack).toEqual([['', null,
				['a', { href: '/site/category/path' }, 'Label']
			]]);
		});

		it('backtrack', () => {
			links[0] = ['site', 'category', 'other'];
			const actual = parseInline('[Label](../path)', stack, links);
			expect(actual).toEqual('');

			expect(stack).toEqual([['', null,
				['a', { href: '/site/path' }, 'Label']
			]]);
		});

		it('title double quotes', () => {
			const actual = parseInline('[Label](/path "Title")', stack, links);
			expect(actual).toEqual('');

			expect(stack).toEqual([['', null,
				['a', { href: '/path', title: 'Title' }, 'Label']
			]]);
		});

		it('title single quotes', () => {
			const actual = parseInline('[Label](/path \'Title\')', stack, links);
			expect(actual).toEqual('');

			expect(stack).toEqual([['', null,
				['a', { href: '/path', title: 'Title' }, 'Label']
			]]);
		});

		it('reference', () => {
			links[0] = ['site'];
			const actual = parseInline('[Label][key]', stack, links);
			const node = ['a', 'key', 'Label'];
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, node]]);
			expect(links).toEqual([['site'], node]);
		});
	});

	describe('html tag', () => {
		it('self closing', () => {
			const actual = parseInline('<br>', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['br', null]]]);
		});
		
		it('forced closing', () => {
			const actual = parseInline('<span />', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['span', null]]]);
		});

		it('opening', () => {
			const actual = parseInline('<span>', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['span', null], ['', null, ['span', null]]]);
		});

		it('closing', () => {
			stack.unshift(['span', null]);
			const actual = parseInline('</span>', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null]]);
		});

		it('with content', () => {
			const actual = parseInline('<span>text</span>', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['span', null, 'text']]]);
		});

		it('with attributes', () => {
			const actual = parseInline('<input type="checkbox" checked>', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['input', { type: 'checkbox', checked: true }]]]);
		});

		it('auto link', () => {
			const actual = parseInline('<http://www.domain.com/path>', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, ['a', { href: 'http://www.domain.com/path' }, 'http://www.domain.com/path']]]);
		});

		it('unwraps root', () => {
			const actual = parseInline('<div>', stack);
			expect(actual).toEqual('');
			expect(stack).toEqual([['div', null], ['', { unwrapped: true }, ['div', null]]]);
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

	it('horizontal rule', () => {
		const actual = parse('---');

		expect(actual).toEqual(['main', null,
			['hr', null],
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
			const actual = parse('# Heading {#lmno}');

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

		it('indentation overage', () => {
			const actual = parse('\t  abc');

			expect(actual).toEqual(['main', null,
				['pre', null,
					['code', null, '  abc'],
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

		it('tick formatting', () => {
			const actual = parse('```\nabc\n```', '/', {
				'': code => ['div', null, code],
			});

			expect(actual).toEqual(['main', null,
				['div', null, 'abc'],
			]);
		});

		it('tick customized', () => {
			const actual = parse('```capitalize\nabc\n```', '/', {
				'': (code, type) => {
					return type === 'capitalize' ? code.toUpperCase() : code;
				},
			});

			expect(actual).toEqual(['main', null,
				['pre', null,
					['code', null, 'ABC'],
				],
			]);
		});

		it('interrupts nesting', () => {
			const actual = parse('    - abc');

			expect(actual).toEqual(['main', null,
				['pre', null,
					['code', null, '- abc'],
				],
			]);
		});

		it('nested space indentation', () => {
			const actual = parse('-     abc\n      xyz');

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						['pre', null,
							['code', null, 'abc\nxyz'],
						],
					],
				],
			]);
		});
	});

	describe('list', () => {
		it('unordered', () => {
			const actual = parse('-  Item');

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
						'Item',
						' Adjacent',
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

		it('interrupted', () => {
			const actual = parse(`
- abc

lmno

- xyz
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null, 'abc'],
				],
				['p', null, 'lmno'],
				['ul', null,
					['li', null, 'xyz'],
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

		it('definition without term', () => {
			const actual = parse(': Child');

			expect(actual).toEqual(['main', null,
				['dl', null,
					['dd', null, 'Child'],
				],
			]);
		});
		
		it('definition with line break term', () => {
			const actual = parse('Item  \nAdjacent\n: Child');

			expect(actual).toEqual(['main', null,
				['dl', null,
					['dt', null, 'Item', ['br'], 'Adjacent'],
					['dd', null, 'Child'],
				],
			]);
		});

		it('with hash heading', () => {
			const actual = parse(`
- # abc
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						[1, null, 'abc'],
					],
				],
			]);
		});

		it('with primary heading', () => {
			const actual = parse(`
- abc
  ===
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						[1, null, 'abc'],
					],
				],
			]);
		});

		it('with horizontal rule', () => {
			const actual = parse(`
- ---
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						['hr', null],
					],
				],
			]);
		});

		it('with table', () => {
			const actual = parse(`
- | abc |
  | --- |
  | 123 |
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						['table', null,
							['thead', null,
								['tr', null,
									['th', null, ' abc '],
								],
							],
							['tbody', null,
								['tr', null,
									['td', null, ' 123 '],
								],
							],
						],
					],
				],
			]);
		});

		it('with space preformatted', () => {
			const actual = parse(`
-     abc
      xyz
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						['pre', null,
							['code', null, 'abc\nxyz'],
						],
					],
				],
			]);
		});

		it('with tick preformatted', () => {
			const actual = parse(`
- \`\`\`
  abc
  \`\`\`
			`);

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						['pre', null,
							['code', null, 'abc'],
						],
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

		it('wrapped lines', () => {
			const actual = parse('> Item\n> Adjacent');

			expect(actual).toEqual(['main', null,
				['blockquote', null,
					['p', null, 'Item', ' Adjacent'],
				],
			]);
		});

		it('multiple lines', () => {
			const actual = parse('> Item  \n> Adjacent');

			expect(actual).toEqual(['main', null,
				['blockquote', null,
					['p', null, 'Item', ['br'], 'Adjacent'],
				],
			]);
		});

		it('separate blocks', () => {
			const actual = parse('> Item\n\n> Adjacent');

			expect(actual).toEqual(['main', null,
				['blockquote', null,
					['p', null, 'Item'],
				],
				['blockquote', null,
					['p', null, 'Adjacent'],
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
		
		it('includes spoiler', () => {
			const actual = parse('| ||Item|| |');

			expect(actual).toEqual(['main', null,
				['table', null,
					['tbody', null,
						['tr', null,
							['td', null,
								['span', {
									style: { color: 'transparent' },
									onclick: {},
								}, 'Item'],
							],
						],
					],
				],
			]);
		});

		it('spoiler before cell', () => {
			const actual = parse('||Item||');

			expect(actual).toEqual(['main', null,
				['p', null,
					['span', {
						style: { color: 'transparent' },
						onclick: {},
					}, 'Item'],
				],
			]);
		});
	});

	describe('checkboxes', () => {
		it('unchecked', () => {
			const actual = parse('- [ ] Item');

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						['input', { type: 'checkbox', checked: false, id: 0 }],
						['label', { for: 0 }, 'Item'],
					],
				],
			]);
		});

		it('checked', () => {
			const actual = parse('- [x] Item');

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						['input', { type: 'checkbox', checked: true, id: 0 }],
						['label', { for: 0 }, 'Item'],
					],
				],
			]);
		});

		it('spaced list', () => {
			const actual = parse('- [ ] Item\n\n- [x] Adjacent');

			expect(actual).toEqual(['main', null,
				['ul', null,
					['li', null,
						['p', null,
							['input', { type: 'checkbox', checked: false, id: 0 }],
							['label', { for: 0 }, 'Item'],
						],
					],
					['li', null,
						['p', null,
							['input', { type: 'checkbox', checked: true, id: 1 }],
							['label', { for: 1 }, 'Adjacent'],
						],
					],
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
## Abc {#abc}
Abc
## Lmno {#lmno}
Lmno
## Xyz {#xyz}
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
## Abc {#abc}
Abc
## Lmno {#lmno}
Lmno
## Xyz {#xyz}
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
## Abc {#abc}
Abc
## Lmno {#lmno}
Lmno
## Xyz {#xyz}
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
## Abc {#abc}
Abc
## Lmno {#lmno}
Lmno
## Xyz {#xyz}
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

	describe('html', () => {
		it('inline', () => {
			const actual = parse(`
abc <span>lmno</span> xyz
			`);

			expect(actual).toEqual(['main', null,
				['p', null,
					'abc ',
					['span', null, 'lmno'],
					' xyz',
				],
			]);
		});

		it('multiple lines', () => {
			const actual = parse(`
abc <span>
lmno
</span> xyz
			`);

			expect(actual).toEqual(['main', null,
				['p', null,
					'abc ',
					['span', null, ' lmno'],
					' xyz',
				],
			]);
		});

		it('wrapped line', () => {
			const actual = parse(`
abc <span>
lm
no
</span> xyz
			`);

			expect(actual).toEqual(['main', null,
				['p', null,
					'abc ',
					['span', null, ' lm', ' no'],
					' xyz',
				],
			]);
		});
		
		it('unwrapped tag', () => {
			const actual = parse(`
abc <div>
lmno
</div> xyz
			`);

			expect(actual).toEqual(['main', null,
				'abc ',
				['div', null, ' lmno'],
				' xyz',
			]);
		});
		
		it('in blockquote', () => {
			const actual = parse(`
> abc <span>
> lmno
> </span> xyz
			`);

			expect(actual).toEqual(['main', null,
				['blockquote', null,
					['p', null,
						'abc ',
						['span', null, ' lmno'],
						' xyz',
					],
				],
			]);
		});
		
		it('unwrapped tag in blockquote', () => {
			const actual = parse(`
> abc <div>
> lmno
> </div> xyz
			`);

			expect(actual).toEqual(['main', null,
				['blockquote', null,
					'abc ',
					['div', null, ' lmno'],
					' xyz',
				],
			]);
		});

		it('ignores strucutural markdown', () => {
			const actual = parse(`
abc <span>
- lmno
</span> xyz
			`);

			expect(actual).toEqual(['main', null,
				['p', null,
					'abc ',
					['span', null, ' - lmno'],
					' xyz',
				],
			]);
		});
	});
});
