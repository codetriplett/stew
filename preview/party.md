```export
{
    '': 'Party',
    name: 'Name // Enter name',
    alias: 'Alias /party// Choose an alias',
    theme: ['Theme / Choose a theme',
        'Spring / #55ffaa',
        'Summer / #ff55aa',
        'Autumn / #ffaa55',
        'Winter / #55aaff',
        'Custom color/',
    ],
    quests: ['Quests /.. Add a quest',
        'Quest /quest//',
    ],
}
.profile { display: flex; gap: 16px; }
.sidebar { flex: 1 0 0; }
.details { flex: 3 0 0; }
.quests { padding: 0; list-style: none; border-top: 1px solid #808080; }
.quest { border-bottom: 1px solid #808080; text-align: center; }

.quest-home { background: #bb993333; }
.quest-mind { background: #0000ff33; }
.quest-body { background: #ff000033; }
.quest-soul { background: #00ff0033; }
.portrait { position: relative; aspect-ratio: 3 / 4; overflow: hidden; }
.background { height: 100%; opacity: 33.333%; }
.torso, .head { position: absolute; left: 50%; border-radius: 50%; transform: translateX(-50%); }
.torso { bottom: -45%; width: 75%; height: 100%; opacity: 66.667%; }
.head { bottom: 45%; width: 50%; height: 45%; }
.title { margin: 0; }
.title a { text-decoration: none; color: var(--paper-font-color); opacity: 0.667; }
.experience { height: 8px; margin: 16px 0 32px 40px; background: #aaff5555; }
.fill { height: 100%; background: #aaff55; }

.level {
    position: absolute;
    width: 32px;
    padding: 2px 0;
    margin: -12px 0 0 -40px;
    font-size: 21px;
    text-align: center;
    color: #aa55ff;
    background: #aa55ff33;
}

.quest a {
    display: block;
    padding: 8px 12px;
    text-decoration: none;
    color: var(--paper-font-color);
}

.grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;

    .link {
        width: 320px;
        max-width: 100%;
        text-align: center;
        text-decoration: none;
        color: var(--paper-font-color);
    }

    .title {
        margin: 16px 0 24px;
    }
}

@media (max-width: 540px) {
    .profile { display: block; }
    .portrait { margin-bottom: 16px; }
}
```

# Party

```export
const [props, content] = arguments;

if (!content) {
	const { pathname } = window.location;
	const names = stew(fetchList, [pathname.slice(0, -1)], []);
	const array = names.map(name => stew(fetchData, [name], {}));

	return ['', null,
		['h1', null, 'Create a party'],
		!array.length ? ['p', null,
			'Notes like this one can set custom layouts for themselves and their children. ',
			'When editing child notes, a button will appear in the upper left to access additional fields used by the layout. ',
			'Add the name of a new party member to the end of the current URL to get started, or click ', ['a', { href: '/party/me' }, 'this one'],
			', then return to this page to see the effect. ',
		] : ['p', null,
			'Now that you\'ve added a party member, try changing the code for this template to make it your own. ',
			'Click the link for this page in the breadcrumb to access its note content, along with the option to make edits. ',
			'The definitions for the fields you used can be changed in the options at the very top, and the code for rendering the layouts can be found the sections beneath it. ',
			'More information on rendering pages can be found ', ['a', { href: '/stew' }, 'here'], '. ',
			'Also, don\'t worry about breaking the page. It can be reset by clearing the content before saving, but only for notes that this site provides as tutorials, not the ones you create from scratch. ',
		],
		['div', { className: 'grid' },
			...array.map(({ name, theme }, i) => ['a', {
				className: 'link',
				href: `${pathname}${names[i]}`,
			},
				profile({ theme }),
				[2, { className: 'title' }, name],
			]),
		],
	];
}

const { name = 'Unknown', alias, theme, quests = [] } = props;
let experience = 0;

const questItems = quests.map(({ '': path, quest, exp = 0, type = 'home', complete }) => {
	if (complete) {
		experience += exp;
		return;
	}

	return ['li', { className: `quest quest-${type}` },
		['a', { href: path.split(' ')[0] }, quest],
	];
}).filter(item => item);

return ['div', { className: 'profile' },
	['div', { className: 'sidebar' },
		profile({ theme }),
		questItems.length > 0 && ['ul', { className: 'quests' }, ...questItems],
	],
	['div', { className: 'details' },
		['h1', { className: 'title' },
			name,
			alias && ['a', { href: alias[''].split(' ')[0] }, ` (${alias.name})`],
		],
		['div', { className: 'experience' },
			['div', { className: 'level' }, Math.floor(experience / 1000) + 1],
			['div', { className: 'fill', style: { width: `${(experience % 1000) / 10 }%` } }],
		],
		['div', { className: 'bio' }, content],
	],
];
```

## Profile

```export
const [props] = arguments;
const { theme = '#777777' } = props;

return ['div', { className: 'portrait' },
	['div', { className: 'background', style: { background: theme } }],
	['div', { className: 'torso', style: { background: theme } }],
	['div', { className: 'head', style: { background: theme } }],
];
```
