export function person () {
	const [props, content] = arguments;

    if (!props) {
        return;
    }

    const { name = 'Unknown', alias, theme = '#777777', quests = [] } = props;
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
            ['div', { className: 'portrait' },
                ['div', { className: 'background', style: { background: theme } }],
                ['div', { className: 'torso', style: { background: theme } }],
                ['div', { className: 'head', style: { background: theme } }],
            ],
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

export default [person, {
    '': 'Person',
    name: 'Name // Enter name',
    alias: 'Alias /party// Choose an alias',
    theme: ['Theme / Choose a theme',
        'Spring / #55ffaa',
        'Summer / #ff55aa',
        'Autumn / #ffaa55', 
        'Winter / #55aaff',
        'Custom color/',
    ],
    exp: 'EXP /0.. Enter experience',
    quests: ['Quests /.. Add a quest',
        'Quest /index//',
    ],
}, ['style', null, `
.profile { display: flex; gap: 16px; }
.sidebar { flex: 1 0 0; }
.details { flex: 3 0 0; }
.quests { padding: 0; list-style: none; border-top: 1px solid #808080; }
.quest { padding: 8px 12px; border-bottom: 1px solid #808080; text-align: center; }
.quest a { text-decoration: none; color: var(--paper-font-color); }
.quest-home { background: #ffffff33; }
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

@media (max-width: 540px) {
    .profile { display: block; }
    .portrait { margin-bottom: 16px; }
}
`]];
