import parse, { parseInline } from './markdown';
import { stack as impulseStack } from './impulse';

let stack, links;

beforeEach(() => {
	stack = [['', null]];
	links = [[], []];
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
		const actual = parseInline(':smile:', stack, links, { '': ':|', smile: ':)' });
		expect(actual).toEqual('');
		expect(stack).toEqual([['', null, ':)']]);
	});

	it.skip('uses fallback emoji', () => {
		const actual = parseInline(':frown:', stack, links, { '': ':|', smile: ':)' });
		expect(actual).toEqual('');
		expect(stack).toEqual([['', null, ':|']]);
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
			expect(links).toEqual([[], [['a', { href: '/path' }, 'Label']]]);

			expect(stack).toEqual([['', null,
				['a', { href: '/path' }, 'Label'],
			]]);
		});

		it('formatted text', () => {
			const actual = parseInline('[*Label*](/path)', stack, links);
			expect(actual).toEqual('');

			expect(links).toEqual([[], [
				['a', { href: '/path' },
					['em', null, 'Label'],
				],
			]]);

			expect(stack).toEqual([['', null,
				['a', { href: '/path' },
					['em', null, 'Label'],
				],
			]]);
		});

		it('image', () => {
			const actual = parseInline('![Label](/path)', stack, links);
			expect(actual).toEqual('');
			expect(links).toEqual([[], []]);

			expect(stack).toEqual([['', null,
				['img', { src: '/path', alt: 'Label' }]
			]]);
		});

		it('non-formatted alt text', () => {
			const actual = parseInline('![*Label*](/path)', stack, links);
			expect(actual).toEqual('');
			expect(links).toEqual([[], []]);

			expect(stack).toEqual([['', null,
				['img', { src: '/path', alt: '*Label*' }]
			]]);
		});

		it('absolute', () => {
			const actual = parseInline('[Label](http://www.domain.com/path)', stack, links);
			expect(actual).toEqual('');
			expect(links).toEqual([[], [['a', { href: 'http://www.domain.com/path' }, 'Label']]]);

			expect(stack).toEqual([['', null,
				['a', { href: 'http://www.domain.com/path' }, 'Label']
			]]);
		});

		it('dotted', () => {
			links[0] = ['site', 'category', 'other'];
			const actual = parseInline('[Label](./path)', stack, links);
			expect(actual).toEqual('');
			expect(links).toEqual([['site', 'category', 'other'], [['a', { href: '/site/category/path' }, 'Label']]]);

			expect(stack).toEqual([['', null,
				['a', { href: '/site/category/path' }, 'Label']
			]]);
		});

		it('backtrack', () => {
			links[0] = ['site', 'category', 'other'];
			const actual = parseInline('[Label](../path)', stack, links);
			expect(actual).toEqual('');
			expect(links).toEqual([['site', 'category', 'other'], [['a', { href: '/site/path' }, 'Label']]]);

			expect(stack).toEqual([['', null,
				['a', { href: '/site/path' }, 'Label']
			]]);
		});

		it('title double quotes', () => {
			const actual = parseInline('[Label](/path "Title")', stack, links);
			expect(actual).toEqual('');
			expect(links).toEqual([[], [['a', { href: '/path', title: 'Title' }, 'Label']]]);

			expect(stack).toEqual([['', null,
				['a', { href: '/path', title: 'Title' }, 'Label']
			]]);
		});

		it('title single quotes', () => {
			const actual = parseInline('[Label](/path \'Title\')', stack, links);
			expect(actual).toEqual('');
			expect(links).toEqual([[], [['a', { href: '/path', title: 'Title' }, 'Label']]]);

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
			expect(links).toEqual([['site'], [['a', 'key', 'Label']], node]);
		});

		it('inferred key', () => {
			links[0] = ['site'];
			const actual = parseInline('[Key][]', stack, links);
			const node = ['a', 'key', 'Key'];
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, node]]);
			expect(links).toEqual([['site'], [['a', 'key', 'Key']], node]);
		});

		it('inferred key image', () => {
			links[0] = ['site'];
			const actual = parseInline('![Key][]', stack, links);
			const node = ['img', 'key', 'Key'];
			expect(actual).toEqual('');
			expect(stack).toEqual([['', null, node]]);
			expect(links).toEqual([['site'], [], node]);
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

		expect(actual).toEqual(['', null,
			['p', null, ' Paragraph '],
		]);
	});

	it('paragraph with wrapped', () => {
		const actual = parse('Paragraph\nAdjacent');

		expect(actual).toEqual(['', null,
			['p', null, ' Paragraph ', ' Adjacent '],
		]);
	});

	it('paragraph with br', () => {
		const actual = parse('Paragraph  \nAdjacent');

		expect(actual).toEqual(['', null,
			['p', null, ' Paragraph ', ['br'], ' Adjacent '],
		]);
	});

	it('paragraph with emoji', () => {
		impulseStack[0] = [,,,, { default: { smile: ':)' } }];
		const actual = parse(':smile:', '/');

		expect(actual).toEqual(['', null,
			['p', null, ':)'],
		]);
	});

	it('paragraph with emoji override', () => {
		const actual = parse(':smile:', '/', { default: { smile: ':)' } });

		expect(actual).toEqual(['', null,
			['p', null, ':)'],
		]);
	});

	it('paragraph separate', () => {
		const actual = parse('Paragraph\n\nAdjacent');

		expect(actual).toEqual(['', null,
			['p', null, ' Paragraph '],
			['p', null, ' Adjacent '],
		]);
	});

	it('between text lines', () => {
		const actual = parse('Item\n[Label](/path)\nAdjacent');

		expect(actual).toEqual(['', null,
			['p', null,
				' Item ',
				['a', { href: '/path' }, 'Label'],
				' Adjacent ',
			],
		]);
	});
	
	it('hash tag', () => {
		const actual = parse('#lmno');

		expect(actual).toEqual(['', null,
			['p', null, ' #lmno '],
		]);
	});

	it('horizontal rule', () => {
		const actual = parse('---');

		expect(actual).toEqual(['', null,
			['hr', null],
		]);
	});

	it('image alt text', () => {
		const actual = parse('![Label](/path)');

		expect(actual).toEqual(['', null,
			['p', null,
				['img', { src: '/path', alt: 'Label' }],
			],
		]);
	});

	describe('heading', () => {
		it('heading primary', () => {
			const actual = parse('Heading\n===');

			expect(actual).toEqual(['', {
				'': 'h#heading',
				heading: ['h1', 'Heading'],
			},
				[1, { id: 'heading' },
					['a', { href: '#heading' }, ' Heading '],
				],
			]);
		});

		it('heading secondary', () => {
			const actual = parse('Heading\n---');

			expect(actual).toEqual(['', {
				'': 'h#heading',
				heading: ['h2', 'Heading'],
			},
				[2, { id: 'heading' },
					['a', { href: '#heading' }, ' Heading '],
				],
			]);
		});
		
		it('one hash', () => {
			const actual = parse('# Heading');

			expect(actual).toEqual(['', {
				'': 'h#heading',
				heading: ['h1', 'Heading'],
			},
				[1, { id: 'heading' },
					['a', { href: '#heading' }, 'Heading'],
				],
			]);
		});
		
		it('six hashes', () => {
			const actual = parse('###### Heading');

			expect(actual).toEqual(['', {
				'': 'h#heading',
				heading: ['h6', 'Heading'],
			},
				[6, { id: 'heading' },
					['a', { href: '#heading' }, 'Heading'],
				],
			]);
		});
		
		it('extra hashes', () => {
			const actual = parse('####### Heading');

			expect(actual).toEqual(['', null,
				['p', null, ' ####### Heading '],
			]);
		});
		
		it('fallback ids', () => {
			const actual = parse('## ???\n## !!!');

			expect(actual).toEqual(['', {
				'': 'h#h-0#h-1',
				'h-0': ['h2', '???'],
				'h-1': ['h2', '!!!'],
			},
				[2, { id: 'h-0' },
					['a', { href: '#h-0' }, '???'],
				],
				[2, { id: 'h-1' },
					['a', { href: '#h-1' }, '!!!'],
				],
			]);
		});
		
		it('hides summary', () => {
			const actual = parse('Summary\n# Heading');

			expect(actual).toEqual(['', {
				'': 'h#heading',
				heading: ['h1', 'Heading'],
			},
				[1, { id: 'heading' },
					['a', { href: '#heading' }, 'Heading'],
				],
			]);
		});
	});

	describe('preformatted', () => {
		it('tab indentation', () => {
			const actual = parse('\tabc');

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, 'abc'],
				],
			]);
		});

		it('space indentation', () => {
			const actual = parse('    abc');

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, 'abc'],
				],
			]);
		});

		it('indentation space overage', () => {
			const actual = parse('\t  abc');

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, '  abc'],
				],
			]);
		});

		it('indentation tab overage', () => {
			const actual = parse('\t\tabc');

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, '    abc'],
				],
			]);
		});

		it('multiple lines', () => {
			const actual = parse('\tabc\n\txyz');

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, 'abc\nxyz'],
				],
			]);
		});

		it('several newlines', () => {
			const actual = parse('\tabc\n\n\n\txyz');

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, 'abc\n\n\nxyz'],
				],
			]);
		});

		it('tick wrapped', () => {
			const actual = parse('```\nabc\n```');

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, 'abc'],
				],
			]);
		});

		it('edge newlines', () => {
			const actual = parse('```\n\nabc\n\n```');

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, '\nabc\n'],
				],
			]);
		});

		it('tick space overage', () => {
			const actual = parse('```\n  abc\n```');

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, '  abc'],
				],
			]);
		});

		it('tick tab overage', () => {
			const actual = parse('```\n\tabc\n```');

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, '    abc'],
				],
			]);
		});

		it('nested ticks', () => {
			const actual = parse('````\n```\nabc\n```\n````');

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, '```\nabc\n```'],
				],
			]);
		});

		it('tick formatting', () => {
			const actual = parse('```\nabc\n```', '/', {
				'': {}
			});

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, 'abc'],
				],
			]);
		});

		it('tick customized', () => {
			function capitalize (flags, code) {
				const { onlyFirst } = flags;
				return onlyFirst ? `${code[0].toUpperCase()}${code.slice(1)}` : code.toUpperCase();
			}

			const actual = parse('```capitalize\nabc\n```', '/', { capitalize });

			expect(actual).toEqual(['', null,
				[capitalize, null, 'abc'],
			]);
		});

		it('tick customized adjacent', () => {
			function capitalize (flags, code) {
				const { onlyFirst } = flags;
				return onlyFirst ? `${code[0].toUpperCase()}${code.slice(1)}` : code.toUpperCase();
			}

			const actual = parse('```capitalize\nabc\n```\n\n```capitalize\nxyz\n```', '/', { capitalize });

			expect(actual).toEqual(['', null,
				[capitalize, null, 'abc'],
				[capitalize, null, 'xyz'],
			]);
		});

		it('tick customized with flags', () => {
			function capitalize (flags, code) {
				const { onlyFirst } = flags;
				return onlyFirst ? `${code[0].toUpperCase()}${code.slice(1)}` : code.toUpperCase();
			}

			const actual = parse('```capitalize delimiter="-" onlyFirst\nabc\n```', '/', { capitalize });

			expect(actual).toEqual(['', null,
				[capitalize, { delimiter: '-', onlyFirst: true }, 'abc'],
			]);
		});
		
		it('tick customized empty', () => {
			function capitalize (flags, code) {
				const { onlyFirst } = flags;
				return onlyFirst ? `${code[0].toUpperCase()}${code.slice(1)}` : code.toUpperCase();
			}

			const actual = parse('```capitalize\n```', '/', { capitalize });

			expect(actual).toEqual(['', null,
				[capitalize, null, ''],
			]);
		});
		
		it('tick customized not closed', () => {
			function capitalize (flags, code) {
				const { onlyFirst } = flags;
				return onlyFirst ? `${code[0].toUpperCase()}${code.slice(1)}` : code.toUpperCase();
			}

			const actual = parse('```capitalize', '/', { capitalize });

			expect(actual).toEqual(['', null,
				[capitalize, null, ''],
			]);
		});

		it('skips missing customizer', () => {
			const actual = parse('```capitalize\nabc\n```', '/', {});

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, 'abc'],
				],
			]);
		});

		it('interrupts nesting', () => {
			const actual = parse('    - abc\n      - xyz');

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, '- abc\n  - xyz'],
				],
			]);
		});

		it('interrupts heading', () => {
			const actual = parse('    # abc');

			expect(actual).toEqual(['', null,
				['pre', null,
					['code', null, '# abc'],
				],
			]);
		});

		it('code indexes', () => {
			const actual = parse('```export\nabc\n```\n\n# lmno\n\n```export\nxyz\n```');

			expect(actual).toEqual(['', {
				'': 'h:#lmno',
				lmno: ['h1:1', 'lmno'],
			},
				[1, { id: 'lmno' },
					['a', { href: '#lmno' }, 'lmno'],
				],
				['pre', null,
					['code', null, 'xyz'],
				],
			]);
		});

		it('code summary index', () => {
			const actual = parse('```export\nabc\n```\n\n# lmno\n\n```export\nxyz\n```', '/path#');

			expect(actual).toEqual(['', {
				'': 'h:1',
			},
				[1, null,
					['a', { href: '/path#' }, 'lmno'],
				],
				['pre', null,
					['code', null, 'abc'],
				],
			]);
		});

		it('code standalone summary index', () => {
			const actual = parse('```export\nabc\n```', '/path#');

			expect(actual).toEqual(['', {
				'': 'h:0',
			},
				['pre', null,
					['code', null, 'abc'],
				],
			]);
		});
	});

	describe('list', () => {
		it('unordered', () => {
			const actual = parse('- Item');

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null, ' Item '],
				],
			]);
		});

		it('multiple items', () => {
			const actual = parse('- Item\n- Adjacent');

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null, ' Item '],
					['li', null, ' Adjacent '],
				],
			]);
		});

		it('empty item', () => {
			const actual = parse('-');

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null],
				],
			]);
		});

		it('nested inline', () => {
			const actual = parse('- - Item');

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null,
						['ul', null,
							['li', null, ' Item '],
						],
					],
				],
			]);
		});

		it('nested ordered inline', () => {
			const actual = parse('2. - Item');

			expect(actual).toEqual(['', null,
				['ol', { start: '2' },
					['li', null,
						['ul', null,
							['li', null, ' Item '],
						],
					],
				],
			]);
		});

		it('spaced items', () => {
			const actual = parse('- Item\n\n- Adjacent');

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null,
						['p', null, ' Item '],
					],
					['li', null,
						['p', null, ' Adjacent '],
					],
				],
			]);
		});

		it('wrapped line', () => {
			const actual = parse(`
- Item
  Adjacent
			`);

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null,
						' Item ', ' Adjacent ',
					],
				],
			]);
		});

		it('line break', () => {
			const actual = parse(`
- Item  
  Adjacent
			`);

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null,
						' Item ',
						['br'],
						' Adjacent ',
					],
				],
			]);
		});

		it('spaced paragraph', () => {
			const actual = parse(`
- Item

  Adjacent
			`);

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null,
						['p', null, ' Item '],
						['p', null, ' Adjacent '],
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

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null,
						['p', null, ' Item '],
						['p', null, ' Adjacent '],
					],
					['li', null,
						['p', null, ' Sibling '],
					],
				],
			]);
		});

		it('separated', () => {
			const actual = parse('- Item\n\n\n- Adjacent');

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null, ' Item '],
				],
				['ul', null,
					['li', null, ' Adjacent '],
				],
			]);
		});

		it('interrupted', () => {
			const actual = parse(`
- abc

lmno

- xyz
			`);

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null, ' abc '],
				],
				['p', null, ' lmno '],
				['ul', null,
					['li', null, ' xyz '],
				],
			]);
		});

		it('ordered', () => {
			const actual = parse('1. Item\n2. Adjacent');

			expect(actual).toEqual(['', null,
				['ol', null,
					['li', null, ' Item '],
					['li', null, ' Adjacent '],
				],
			]);
		});

		it('offset start', () => {
			const actual = parse('2. Item\n3. Adjacent');

			expect(actual).toEqual(['', null,
				['ol', { start: '2' },
					['li', null, ' Item '],
					['li', null, ' Adjacent '],
				],
			]);
		});

		it('mixed', () => {
			const actual = parse('- Item\n\n1. Adjacent');

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null, ' Item '],
				],
				['ol', null,
					['li', null, ' Adjacent '],
				],
			]);
		});

		it('nested', () => {
			const actual = parse('- Item\n  - Child');

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null,
						' Item ',
						['ul', null,
							['li', null, ' Child '],
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

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null,
						['p', null, ' Item '],
						['ul', null,
							['li', null, ' Subitem '],
						],
					],
				],
			]);
		});
		
		it('definition list', () => {
			const actual = parse('Item\n: Child');

			expect(actual).toEqual(['', null,
				['dl', null,
					['dt', null, ' Item '],
					['dd', null, ' Child '],
				],
			]);
		});
		
		it('definition multiple', () => {
			const actual = parse('Item\n: Child\n: Adjacent');

			expect(actual).toEqual(['', null,
				['dl', null,
					['dt', null, ' Item '],
					['dd', null, ' Child '],
					['dd', null, ' Adjacent '],
				],
			]);
		});
		
		it('definition spaced', () => {
			const actual = parse('Item\n\n: Child\n\n: Adjacent');

			expect(actual).toEqual(['', null,
				['dl', null,
					['dt', null, ' Item '],
					['dd', null,
						['p', null, ' Child '],
					],
					['dd', null,
						['p', null, ' Adjacent '],
					],
				],
			]);
		});

		it('definition without term', () => {
			const actual = parse(': Child');

			expect(actual).toEqual(['', null,
				['dl', null,
					['dd', null, ' Child '],
				],
			]);
		});
		
		it('definition with line break term', () => {
			const actual = parse('Item  \nAdjacent\n: Child');

			expect(actual).toEqual(['', null,
				['dl', null,
					['dt', null, ' Item ', ['br'], ' Adjacent '],
					['dd', null, ' Child '],
				],
			]);
		});

		it('with hash heading', () => {
			const actual = parse(`
- # abc
			`);

			expect(actual).toEqual(['', null,
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

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null,
						[1, null, ' abc '],
					],
				],
			]);
		});

		it('with horizontal rule', () => {
			const actual = parse(`
- ---
			`);

			expect(actual).toEqual(['', null,
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

			expect(actual).toEqual(['', null,
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

			expect(actual).toEqual(['', null,
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

			expect(actual).toEqual(['', null,
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

			expect(actual).toEqual(['', null,
				['blockquote', null,
					['p', null, ' Item '],
				],
			]);
		});

		it('wrapped lines', () => {
			const actual = parse('> Item\n> Adjacent');

			expect(actual).toEqual(['', null,
				['blockquote', null,
					['p', null, ' Item ', ' Adjacent '],
				],
			]);
		});

		it('multiple lines', () => {
			const actual = parse('> Item  \n> Adjacent');

			expect(actual).toEqual(['', null,
				['blockquote', null,
					['p', null, ' Item ', ['br'], ' Adjacent '],
				],
			]);
		});

		it('separate blocks', () => {
			const actual = parse('> Item\n\n> Adjacent');

			expect(actual).toEqual(['', null,
				['blockquote', null,
					['p', null, ' Item '],
				],
				['blockquote', null,
					['p', null, ' Adjacent '],
				],
			]);
		});
	});

	describe('table', () => {
		it('cell', () => {
			const actual = parse('|Item|');

			expect(actual).toEqual(['', null,
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

			expect(actual).toEqual(['', null,
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
			const actual = parse('|:--|:-:|--:|\n|1|2|3|\n|A|B|C|');

			expect(actual).toEqual(['', null,
				['table', null,
					['tbody', null,
						['tr', null,
							['td', { style: { textAlign: 'left' } }, '1'],
							['td', { style: { textAlign: 'center' } }, '2'],
							['td', { style: { textAlign: 'right' } }, '3'],
						],
						['tr', null,
							['td', { style: { textAlign: 'left' } }, 'A'],
							['td', { style: { textAlign: 'center' } }, 'B'],
							['td', { style: { textAlign: 'right' } }, 'C'],
						],
					],
				],
			]);
		});

		it('with header', () => {
			const actual = parse('|L|C|R|\n|---|:-:|--:|\n|1|2|3|\n|A|B|C|');

			expect(actual).toEqual(['', null,
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

			expect(actual).toEqual(['', null,
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

			expect(actual).toEqual(['', null,
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

			expect(actual).toEqual(['', null,
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

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null,
						['input', { type: 'checkbox', checked: false, id: 'c-0' }],
						['label', { for: 0 }, 'Item'],
					],
				],
			]);
		});

		it('checked', () => {
			const actual = parse('- [x] Item');

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null,
						['input', { type: 'checkbox', checked: true, id: 'c-0' }],
						['label', { for: 0 }, 'Item'],
					],
				],
			]);
		});

		it('spaced list', () => {
			const actual = parse('- [ ] Item\n\n- [x] Adjacent');

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null,
						['p', null,
							['input', { type: 'checkbox', checked: false, id: 'c-0' }],
							['label', { for: 0 }, 'Item'],
						],
					],
					['li', null,
						['p', null,
							['input', { type: 'checkbox', checked: true, id: 'c-1' }],
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

			expect(actual).toEqual(['', null,
				['p', null,
					['a', { href: '/path' }, 'Item'],
				],
			]);
		});

		it('lower definition', () => {
			const actual = parse('[Item][key]\n[key]: /path');

			expect(actual).toEqual(['', null,
				['p', null,
					['a', { href: '/path' }, 'Item'],
				],
			]);
		});

		it('title', () => {
			const actual = parse('[key]: /path "title"\n[Item][key]');

			expect(actual).toEqual(['', null,
				['p', null,
					['a', { href: '/path', title: 'title' }, 'Item'],
				],
			]);
		});

		it('title on newline', () => {
			const actual = parse('[key]: /path\n[Item][key]\n"title"');

			expect(actual).toEqual(['', null,
				['p', null,
					['a', { href: '/path', title: 'title' }, 'Item'],
				],
			]);
		});

		it('inferred key', () => {
			const actual = parse('[key]: /path\n[Key][]');

			expect(actual).toEqual(['', null,
				['p', null,
					['a', { href: '/path' }, 'Key'],
				],
			]);
		});

		it('image', () => {
			const actual = parse('[key]: /path\n![Item][key]');

			expect(actual).toEqual(['', null,
				['p', null,
					['img', { src: '/path', alt: 'Item' }],
				],
			]);
		});

		it('inferred key image', () => {
			const actual = parse('[key]: /path\n![Key][]');

			expect(actual).toEqual(['', null,
				['p', null,
					['img', { src: '/path', alt: 'Key' }],
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

			expect(actual).toEqual(['', null,
				['ul', null,
					['li', null, ' Item '],
				],
				['ul', null,
					['li', null, ' Adjacent '],
				],
			]);
		});
	});

	describe('scopes', () => {
		it('summary', () => {
			const actual = parse(`
[Summary](/)
# Heading
[Paragraph](/)
## Abc {#abc}
[Abc](/abc)
### Lmno {#lmno}
[Lmno](/lmno)
## Xyz {#xyz}
[Xyz](/xyz)
			`, '/path#');

			expect(actual).toEqual(['', null,
				[1, null,
					['a', { href: '/path#' }, 'Heading'],
				],
				['p', null,
					['a', { href: '/' }, 'Summary'],
				],
			]);
		});
		
		it('summary and h1', () => {
			const actual = parse(`
[Summary](/)
# Heading
[Paragraph](/)
## Abc {#abc}
[Abc](/abc)
### Lmno {#lmno}
[Lmno](/lmno)
## Xyz {#xyz}
[Xyz](/xyz)
			`, '/path#heading#');

			expect(actual).toEqual(['', {
				'': 'h#heading',
				heading: ['h1', 'Heading', ['a', { href: '/' }, 'Paragraph']],
			},
				['p', null,
					['a', { href: '/' }, 'Summary'],
				],
				[1, null,
					['a', { href: '/path#heading' }, 'Heading'],
				],
				['p', null,
					['a', { href: '/' }, 'Paragraph'],
				],
			]);
		});

		it('single', () => {
			const actual = parse(`
[Summary](/)
# Heading
[Paragraph](/)
## Abc {#abc}
[Abc](/abc)
### Lmno {#lmno}
[Lmno](/lmno)
## Xyz {#xyz}
[Xyz](/xyz)
			`, '/path#lmno');

			expect(actual).toEqual(['', {
				'': 'h#lmno',
				lmno: ['h3', 'Lmno', ['a', { href: '/lmno' }, 'Lmno']],
			},
				[3, null,
					['a', { href: '/path#lmno' }, 'Lmno'],
				],
				['p', null,
					['a', { href: '/lmno' }, 'Lmno'],
				],
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

			expect(actual).toEqual(['', {
				'': 'h#lmno',
				lmno: ['h2', 'Lmno'],
			},
				['p', null, ' Summary '],
				[2, null,
					['a', { href: '/path#lmno' }, 'Lmno'],
				],
				['p', null, ' Lmno '],
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

			expect(actual).toEqual(['', {
				'': 'h#abc#xyz',
				abc: ['h2', 'Abc'],
				xyz: ['h2', 'Xyz'],
			},
				[2, null,
					['a', { href: '/path#abc' }, 'Abc'],
				],
				['p', null, ' Abc '],
				[2, null,
					['a', { href: '/path#xyz' }, 'Xyz'],
				],
				['p', null, ' Xyz '],
			]);
		});

		it('unscoped list below', () => {
			const actual = parse(`
# Abc {#abc}
Abc
# Xyz {#xyz}
- lmno
- xyz
			`, '/path#abc');

			expect(actual).toEqual(['', {
				'': 'h#abc',
				abc: ['h1', 'Abc'],
			},
				[1, null,
					['a', { href: '/path#abc' }, 'Abc'],
				],
				['p', null, ' Abc '],
			]);
		});

		it('unscoped list above', () => {
			const actual = parse(`
# Abc {#abc}
- abc
- lmno
# Xyz {#xyz}
Xyz
			`, '/path#xyz');

			expect(actual).toEqual(['', {
				'': 'h#xyz',
				xyz: ['h1', 'Xyz'],
			},
				[1, null,
					['a', { href: '/path#xyz' }, 'Xyz'],
				],
				['p', null, ' Xyz '],
			]);
		});

		it('skips nested headings', () => {
			const actual = parse(`
# Abc {#abc}
Abc

- ## Lmno {#lmno}
  Lmno

# Xyz {#xyz}
Xyz
			`, '/path#abc');

			expect(actual).toEqual(['', {
				'': 'h#abc',
				abc: ['h1', 'Abc'],
			},
				[1, null,
					['a', { href: '/path#abc' }, 'Abc'],
				],
				['p', null, ' Abc '],
				['ul', null,
					['li', null,
						[2, null, 'Lmno'],
						' Lmno ',
					],
				],
			]);
		});
	});

	describe('html', () => {
		it('inline', () => {
			const actual = parse(`
abc <span>lmno</span> xyz
			`);

			expect(actual).toEqual(['', null,
				['p', null,
					' abc ',
					['span', null, 'lmno'],
					' xyz ',
				],
			]);
		});

		it('multiple lines', () => {
			const actual = parse(`
abc <span>
lmno
</span> xyz
			`);

			expect(actual).toEqual(['', null,
				['p', null,
					' abc ',
					['span', null, ' lmno '],
					' xyz ',
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

			expect(actual).toEqual(['', null,
				['p', null,
					' abc ',
					['span', null, ' lm ', ' no '],
					' xyz ',
				],
			]);
		});
		
		it('unwrapped tag', () => {
			const actual = parse(`
abc <div>
lmno
</div> xyz
			`);

			expect(actual).toEqual(['', null,
				' abc ',
				['div', null, ' lmno '],
				' xyz ',
			]);
		});

		it('wrapped tags', () => {
			const actual = parse(`
abc <span>lm</span>
<span>no</span> xyz
			`);

			expect(actual).toEqual(['', null,
				['p', null,
					' abc ',
					['span', null, 'lm'],
					' ',
					['span', null, 'no'],
					' xyz ',
				],
			]);
		});

		it('wrapped tags in tag', () => {
			const actual = parse(`
abc <span>
<span>lm</span>
<span>no</span>
</span> xyz
			`);

			expect(actual).toEqual(['', null,
				['p', null,
					' abc ',
					['span', null,
						['span', null, 'lm'],
						' ',
						['span', null, 'no'],
					],
					' xyz ',
				],
			]);
		});
		
		it('in blockquote', () => {
			const actual = parse(`
> abc <span>
> lmno
> </span> xyz
			`);

			expect(actual).toEqual(['', null,
				['blockquote', null,
					['p', null,
						' abc ',
						['span', null, ' lmno '],
						' xyz ',
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

			expect(actual).toEqual(['', null,
				['blockquote', null,
					' abc ',
					['div', null, ' lmno '],
					' xyz ',
				],
			]);
		});

		// TOOD: allow markdown in html
		// - add tags to stack instead of separate tags array
		// - need to differentiate containers in stack that were opened by markdown symbols and html
		// - only containers that were created by html can be closed by html
		// - add attributes to props of html containers
		it.skip('nests structural markdown', () => {
			const actual = parse(`
abc <span>
- lmno
</span> xyz
			`);

			expect(actual).toEqual(['', null,
				['p', null,
					' abc ',
					['span', null,
						['ul', null,
							['li', null, 'lmno'],
						],
					],
					' xyz ',
				],
			]);
		});
	});
});
