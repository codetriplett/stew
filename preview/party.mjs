export function person () {
	const [props, content] = arguments;

    if (!props) {
        // missing props means we are rendering the landing page

        return ['', null,
            ['form', {
                onsubmit: event => {
                    // read the input value
                    const { value } = event.target.elements.name;
                    
                    const formattedValue = value.toLowerCase() // only allow lowercase characters
                        .replace(/[^a-z]+/g, '-') // replace any sequences of non-alpha characters with a dash
                        .replaceAll(/^-|-$/g, ''); // trim dashes from start end end of string

                    if (!formattedValue) {
                        // cancel navigation if formatted name is empty
                        event.preventDefault();
                        return;
                    }
                
                    // append formatted name to form's destination url
                    event.target.action = formattedValue;
                },
            },
                ['input', { id: 'name', placeholder: 'Enter Name' }],
                ['button', { type: 'submit' }, 'View Contact'],
            ],
        ];
    }

    // render the contact page
    const {
        name = 'Unknown', role = 'Commoner', theme = '#777777',
        exp = 300, str = 1, def = 1,
        quest, friends, items,
    } = props;

    let questSummary;

    if (quest) {
        const { '': path, quest: name, exp, type } = quest;

        if (/[^\/]$/.test(path)) {
            // TODO: store paths without leading slash
            const note = stew(fetchNote, [path.slice(1)], null);
            questSummary = stew(note, [`${window.location.pathname}#`]);
        }
    }

    return ['', null,
        ['div', { className: 'profile' },
            ['div', { className: 'card' },
                // create an element that will render a portrait with CSS. An opacity value is added for effect.
                ['div', { className: 'portrait', style: { background: `${theme}5` } },
                    ['div', { className: 'torso', style: { background: `${theme}a` } }],
                    ['div', { className: 'head', style: { background: theme } }],
                ],
                ['ul', { className: 'stats' },
                    ['li', null, ['strong', null, 'STR: '], str],
                    ['li', null, ['strong', null, 'DEF: '], def],
                ],
                // TODO: make this collapsable at smaller breakpoint
                ['ul', { className: 'items' },
                    ...items.map(({ name, count = 0 }) => {
                        return name && ['li', null, name, ['b', { className: 'count' }, `x${count}`]];
                    }),
                ],
            ],

            ['div', { className: 'details' },
                // Print name, level, and role. Level advances 1 per 1000 points.
                ['h1', { className: 'title' }, `${name} (lvl ${Math.floor(exp / 1000) + 1} ${role})`],
                
                // Style a progress bar of the remaining experience left in current level.
                ['div', { className: 'experience' },
                    ['div', { className: 'experience-fill', style: { width: `${(exp % 1000) / 10 }%` } }],
                ],
                
                ['div', { className: 'quest' }, questSummary],

                ['div', { className: 'bio' }, content],
            ],
        ],

        // TODO: put friends here
        // - move the portrait rendering code to its own function so it can be reused here
        // - just render portrait and name, with links to their pages
    ];
}

export default [person, {
    '': 'Person',
    name: 'Name // Enter name',
    role: ['Role / Choose a role',
        'Mage / mage',
        'Warrior / warrior',
        'Rogue / rogue',
    ],
    theme: ['Theme / Choose a color',
        'Spring / #5fa',
        'Summer / #f5a',
        'Autumn / #fa5',
        'Winter / #5af',
    ],
    exp: 'EXP /0.. Enter experience',
    str: 'STR /1.. Enter strength',
    def: 'DEF /1.. Enter defense',
    quest: 'Quest /index// Choose a quest',
    items: ['Items /.. Add an item',
        {
            '': 'Item / name',
            name: 'Name // Enter name',
            count: 'Count // Enter count',
        },
    ],
    friends: ['Friends /.. Add friend',
        'Person /person// Choose a person',
    ],
}, ['style', null, `
.profile {
    display: flex;
    gap: 16px;
}
.card {
    flex: 1 0 0;
}
.portrait {
    position: relative;
    aspect-ratio: 3 / 4;
    overflow: hidden;
}
.torso,
.head {
    position: absolute;
    left: 50%;
    border-radius: 50%;
    transform: translateX(-50%);
}
.torso {
    bottom: -45%;
    width: 75%;
    height: 100%;
}
.head {
    bottom: 45%;
    width: 50%;
    height: 45%;
}
.stats,
.items {
    margin: 16px 0;
    padding: 0;
    list-style: none;
}
.stats {
    display: flex;
    gap: 16px;
}
.stats > * {
    flex: 1 0 0;
    text-align: center;
}
.items {
    max-width: 240px;
    margin-left: auto;
    margin-right: auto;
    padding-right: 48px;
    font-size: 17px;
    text-align: right;
}
.items > * {
    position: relative;
}
.count {
    position: absolute;
    left: 100%;
    padding-left: 8px;
}
.title {
    margin: 0 0 16px;
}
.details {
    flex: 3 0 0;
}
.experience {
    height: 8px;
    background: #00ff0055;
}
.experience-fill {
    height: 100%;
    background: #00ff00;
}
@media (max-width: 540px) {
    .profile {
        display: block;
    }
    .portrait {
        margin-bottom: 16px;
    }
}
`]];
