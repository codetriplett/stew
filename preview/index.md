```export
{
	'': 'journal',
    smile: '🙂',
    rotfl: '🤣',
    sob: '😭',
    skull: '💀',
    thumb: '👍',
    eyes: '👀',
    shrug: '🤷‍♀️',
    facepalm: '🤦‍♀️',
    upsidedown: '🙃',
    hundred: '💯',
    fire: '🔥',
    sparkle: '✨',
    check: '✅',
    heart: '❤️',
    think: '🤔',
}
.stew-demo {
    display: flex;
    gap: 16px;

    > div:first-child {
        flex: 3 1 0;
        overflow-x: auto;
        font-family: monospace;
        white-space: pre;
    }
    > div:last-child {
        flex: 2 1 0;
        overflow-x: auto;
        padding: 16px;
        background: var(--page-background);
    }
    h1 {
        text-align: left;
    }
    form {
        ul {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 0;
            list-style: none;

            ul,
            ol {
                margin-top: 10px;
                padding-left: 12px;
                border-left: 1px solid var(--paper-font-color);
            }
        }
        input:not([type="checkbox"]),
        textarea,
        select {
            display: block;
            box-sizing: border-box;
            width: 100%;
            margin-top: 4px
        }
        textarea {
            min-height: 51px;
            resize: vertical;
        }
        input[type="checkbox"] {
            float: left;
            margin-right: 5px;
        }
        .action-button {
            float: right;
            width: 21px;
            height: 21px;
            padding: 6px 0 0;
            margin-top: -2px;
            font-weight: bold;
        }
        .reset-button {
            float: left;
            margin-right: 4px;
        }
        .select-label .action-button,
        .reset-button {
            padding-top: 0;
        }
        button {
            border: 1px solid var(--paper-font-color);
            background: var(--paper-background);
        }
    }
}
@media (max-width: 720px) {
    .stew-demo {
        display: block !important;

        > *  + * {
            margin-top: 16px;
        }
    }
}

.card {
    position: relative;
    box-sizing: border-box;
    width: 144px;
    height: 204px;
    padding: 12px;
    margin: 0;
    text-align: center;
    list-style: none;
    transform-origin: 0 0;
    z-index: 9;

    &:before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        display: block;
        border-radius: 12px;
        background-size: 720px 552px;
        image-rendering: pixelated;
        transform-origin: 0 0;
        z-index: -1;
    }
    li {
        display: flex;
        gap: 4px;
        height: 24px;
        overflow: hidden;

        &:nth-child(4) > span {
            display: none;
        }
        &:nth-child(n + 5) {
            flex-direction: row-reverse;
        }
        + li {
            padding-top: 2px;
        }
        > span {
            flex: 0 0 24px;
            font-weight: bold;
            font-size: 12px;
            line-height: 24px;
            color: #555;
        }
        a {
            flex: 1 1 0;
            position: relative;
            color: #333;
            
            > span {
                position: absolute;
                left: 50%;
                top: 50%;
                max-height: 22px;
                line-height: 11px;
                transform: translate(-50%, -50%);
                -webkit-line-clamp: 2;
                text-overflow: ellipsis;
                font-family: monospace;
            }
        }
    }
    .today {
        box-shadow: inset 0 0 2px 2px black;
        background: #333;

        > span {
            display: none;
        }
        a {
            color: #eee;
        }
    }
    .steps {
        position: relative;
        top: -3px;
        margin-left: 3px;
        font-size: 21px;
    }
}
.season-0:before { background-image: url(/winter-cards.png); }
.season-1:before { background-image: url(/spring-cards.png); }
.season-2:before { background-image: url(/summer-cards.png); }
.season-3:before { background-image: url(/autumn-cards.png); }
.season-4:before { background-image: url(/joker-card.png); }
.week-0:before { background-position: calc(-0 * 144px) calc(-0 * 204px); }
.week-1:before { background-position: calc(-1 * 144px) calc(-0 * 204px); }
.week-2:before { background-position: calc(-2 * 144px) calc(-0 * 204px); }
.week-3:before { background-position: calc(-3 * 144px) calc(-0 * 204px); }
.week-4:before { background-position: calc(-4 * 144px) calc(-0 * 204px); }
.week-5:before { background-position: calc(-0 * 144px) calc(-1 * 204px); }
.week-6:before { background-position: calc(-1 * 144px) calc(-1 * 204px); }
.week-7:before { background-position: calc(-2 * 144px) calc(-1 * 204px); }
.week-8:before { background-position: calc(-3 * 144px) calc(-1 * 204px); }
.week-9:before { background-position: calc(-4 * 144px) calc(-1 * 204px); }
.week-10:before { background-position: calc(-0 * 204px) calc(-2 * 204px); }
.week-11:before { background-position: calc(-1 * 204px) calc(-2 * 204px); }
.week-12:before { background-position: calc(-2 * 204px) calc(-2 * 204px); }
.week-10:before,
.week-11:before,
.week-12:before {
    width: 204px;
    height: 144px;
    transform: rotate(90deg) translateY(-100%);
}
.faded-card { opacity: 0.5 }
.nav-card { margin: 8px 4px 116px; transform: scale(1.5); }
.month { box-shadow: inset 0 8px 8px -4px gray; }
.quest { display: block; width: 100%; font-size: 11px; }
.exp {
    border-radius: 4px;
    padding: 0 4px;
    font-size: 15px;
    font-weight: bold;
    white-space: nowrap;
    background: #fffd;
    box-shadow: 0 0 4px 4px #fffd;
}
.exp-home { color: #b93; }
.exp-mind { color: #33b; }
.exp-body { color: #b33; }
.exp-soul { color: #3b3; }
```

# Make a note. Build a space.

```render
return ['style', null, `
.flex-links {
	display: flex;
	justify-content: space-around;
	gap: 16px;
	text-align: center;

    > * {
        flex: 1 0 0;
    }
	a {
		font-size: 21px;
	}
}
`];
```

This site serves as a place to store and browse your notes. 
It also supports embedded code to create web pages and games. 
Everything is editable and is stored in your browser, but a downloadable version will also be available in the future. 
Visit the guides and examples below to learn more, or navigate to any URL you wish to create a new note. 
Notice how the ones in the second row have a trailing slash in their URL. 
This will render them according to their embedded code. 
Remove the slash to view the note in its basic form, and to allow editing its content and code. 

```render
return ['div', { className: 'flex-links' },
    ['div', null,
        ['a', { href: '/markdown' }, 'Markdown'],
        ['p', null, 'Decorates notes with basic HTML.'],
    ],
    ['div', null,
        ['a', { href: '/stew' }, 'Stew'],
        ['p', null, 'Enables custom layouts and interactivity.'],
    ],
    ['div', null,
        ['a', { href: '/webgl' }, 'WebGL'],
        ['p', null, 'Streamlines 2D and 3d graphics.'],
    ],
];
```

```render
return ['div', { className: 'flex-links' },
    ['div', null,
        ['a', { href: '/quest/' }, 'Quest'],
        ['p', null, 'A basic demo of custom pages with data.'],
    ],
    ['div', null,
        ['a', { href: '/journal/' }, 'Journal'],
        ['p', null, 'A view of your quest progress by season.'],
    ],
    ['div', null,
        ['a', { href: '/cube/' }, 'Cube'],
        ['p', null, 'A 3D puzzle cube to fidget with.'],
    ],
];
```

You'll notice the guides have a left navigation that can be toggled to navigate their sections. 
This is created automatically for any notes that have a primary heading above secondary headings. 
When a section is scrolled to from this navigation, its embedded links will also appear at the bottom of the list. 
Clicking these links, or the underlined one for the active section will open its content as a snip. 
Snips are shown in a sidebar to the right of your notes as you navigate for quick reference. 
When notes are viewed with a trailing slash in the URL, the left navigation will provide links to the notes directly beneath them. 
Notes can also hold a summary by putting content above the main heading. 
This is what is shown for the active day on the home page. 

## Capitalize

```export
const [flags, code] = arguments;
const { all } = flags;
return ['p', null, all ? code.toUpperCase() : `${code[0]}${code.slice(1)}`];
```

## Render

```export
const [flags, code] = arguments;
return new Function(code);
```

## Demo

```export
const [{ markdown, form }, code] = arguments;
let result, output;

if (markdown) {
    result = stew(code, ['/']);
} else if (form) {
    const schema = new Function(`return ${code}`)();
    output = ['', null, ['pre', null, '{}']];

    result = renderForm(schema, data => {
        const [pre] = output[0];
        pre.innerHTML = JSON.stringify(data, null, 4);
    });
} else {
    result = new Function(code);
}

const lines = markdown ? [code] : code.split(/\r\n|\r|\n/).map(line => {
    const [, text, comment] = line.match(/^(.*?)(?:\s*\/\/\s*([+-]))?\s*$/);

    return ['div', {
        style: comment && { backgroundColor: comment === '-' ? 'rgba(191, 63, 63, 0.125)' : 'rgba(63, 191, 63, 0.125)' },
    }, text || ' '];
});

return ['div', { className: 'stew-demo' },
    ['div', null, ...lines],
    ['div', null, result, output],
];
```

## Card

```export
const [props, inputName] = arguments;
let { forNav, nameOnly, todayName, state, onclick } = props;

if (typeof inputName !== 'string' || !/^(\d{6}|\d{8})$/.test(inputName)) {
    // reject inputs that aren't strings of length 6 or 8
    return;
}

// read first parts of string, and create date for beginning of year
let year = Number(inputName.slice(0, 4));
const day = Number(inputName.slice(6, 8));
const date = new Date(`${year}-01-${day < 10 ? '0' : ''}${day || 7}T00:00:00`);
let week = inputName.slice(4, 6) - 1;

if (!day) {
    // shift by number of weeks past the first
    date.setDate((week + 1) * 7 - date.getDay());

    if (date.getFullYear() > year) {
        // don't render if there is no 52nd week for this year
        return;
    }
} else {
    // use week index as month instead, and the rest of string as the day
    date.setMonth(week);
    date.setDate(date.getDate() + 5 * 7 - date.getDay());
    year = date.getFullYear();

    // calculate number of weeks since start of year
    const start = new Date(`${year}-01-07T00:00:00`);
    start.setDate(start.getDate() - start.getDay());
    week = Math.round((date - start) / (7 * 24 * 60 * 60 * 1000));
    todayName = inputName;
}

const season = Math.floor(week / 13);
date.setDate(date.getDate() - 5 * 7);

if (nameOnly) {
    if (!day) {
        // return the first day name in card
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}${month < 10 ? '0' : ''}${month}${day < 10 ? '0' : ''}${day}`;
    }
    
    // return the week name of the card
    return `${year}${week + 1}`;
}

// render card layout, fetching the quest data for each day
const card = ['ul', {
    className: [
        'card',
        `season-${season}`,
        `week-${week % 13}`,
        forNav ? 'nav-card' : '',
        onclick ? 'faded-card' : '',
    ].join(' '),
    onclick,
}];

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const list = stew(fetchList, ['/journal'], []);

for (let i = 0; i < 7; i++) {
    // get date components and then increment
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // build date string and fetch quest data
    const dayName = `${year}${month < 10 ? '0' : ''}${month}${day < 10 ? '0' : ''}${day}`;
    const className = `${day === 1 ? 'month' : ''} ${ dayName === todayName ? 'today' : ''}`;
    const href = `/journal/${dayName}`;
    const data = list.indexOf(dayName) !== -1 ? stew(fetchData, [href], {}) : {};
    const textProps = { className: 'quest' };
    let { name = '', exp = 0, focus = 'home', complete, steps } = data;
    
    if (state && complete) {
        state[focus] = { ...state[focus], [dayName]: exp };
    }

    if (!name && (i === 0 || i === 6)) {
        // label the top and bottom rows if they are blank
        name = `${new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)} ${day}`;
        textProps.style = { fontSize: name.length > 10 ? '11px' : '15px', fontWeight: 'bold' };
    }

    card.push(['li', { className },
        ['span', null, i === 2 || i === 4 ? day : ''],
        ['a', { href: !onclick && href },
            ['span', textProps, name],
            (steps >= 6000 || complete) && ['span', { className: `exp exp-${focus}` },
                complete && `+${exp}`,
                steps >= 6000 && ['span', { className: 'steps' },
                    steps > 15000 ? '🥾' : steps >= 9000 ? '👟' :  '👞',
                ],
            ],
        ],
    ]);
    
    // move to next day
    date.setDate(day + 1);
}

return card;
```
