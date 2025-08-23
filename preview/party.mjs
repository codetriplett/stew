export function profile () {
	const [props] = arguments;
	const { theme = '#777777' } = props;

	return ['div', { className: 'portrait' },
	    ['div', { className: 'background', style: { background: theme } }],
	    ['div', { className: 'torso', style: { background: theme } }],
	    ['div', { className: 'head', style: { background: theme } }],
	];
}

export function party () {
	const [props, content] = arguments;

	if (!props) {
	    const { pathname } = window.location;
	    const names = stew(fetchList, [pathname.slice(0, -1)], []);
	    const array = names.map(name => stew(fetchData, [name], {}));

	    return ['', null,
			['h1', null, 'Create a party'],
			['p', null,
				'This demo shows the basics of editing notes that have fields, and using that date to create a custom layout. ',
				'Navigate to a note under this landing page to get started, like ', ['a', { href: '/party/me' }, 'this one'], '. ',
				'Landing pages end with a trailing slash, and their layouts and the ones for their child pages fully editable. ',
				'Like the rest of your notes, any changes you make to these templates are only stored in your browser. ',
				'If you wish to reset one of the preset templates on this site, just clear its content and save. ',
				'To learn more about how the code for templates, visite the ', ['a', { href: '/stew' }, 'Stew guide. '],
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
}

export default [party, {
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
        'Quest /index//',
    ],
}, ['style', null, `
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
`]];
