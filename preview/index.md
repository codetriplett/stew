```export
{
	'': 'journal',
    smile: '🙂',
    rotfl: '🤣',
    sob: '😭',
    think: '🤔',
    upsidedown: '🙃',
    skull: '💀',
    shrug: '🤷‍♀️',
    facepalm: '🤦‍♀️',
    eyes: '👀',
    thumb: '👍',
    hundred: '💯',
    fire: '🔥',
    sparkle: '✨',
    check: '✅',
    heart: '❤️',
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

# Make a note

```render
return ['', null,
    ['style', null, `
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
    p {
        margin: 8px 0 0;
    }
}
.create-form {
    display: flex;
    gap: 4px;

    > * {
        height: 24px !important;
        margin: 0 !important;
    }
}
    `],
    ['form', {
        className: 'create-form',
        onsubmit: event => {
            event.preventDefault();
            const { value } = event.target.heading;

            const name = value.toLowerCase()
                .replace(/[^a-z0-9\/]+/g, '-')
                .replace(/-*\/-*/g, '/')
                .replace(/^-|-$/g, '');

            window.location.href = name;
        }
    },
        ['input', { id: 'heading', placeholder: 'Enter new heading' }],
        ['button', { type: 'submit' }, 'Create'],
    ],
];
```

All notes are stored in your browser, and will persist as long as you avoid clearing your local storage. 
Read more about the formatting options available below. 
Notes with secondary headings under the main one will include a menu you can toggle in the upper left. 
Deep links are supported to specific sections of other notes by adding a hash value to the URL. 
These links will show under the lefthand menu when the section that contains them is active. 
Clicking them, or the already active heading in the menu will open them to the side and follow you as you browse. 

```render
return ['div', { className: 'flex-links' },
    ['div', null,
        ['a', { href: '/markdown' }, 'Markdown'],
        ['p', null, 'Rich text formatting'],
    ],
    ['div', null,
        ['a', { href: '/stew' }, 'Stew'],
        ['p', null, 'Customized and interactive layouts'],
    ],
    ['div', null,
        ['a', { href: '/webgl' }, 'WebGL'],
        ['p', null, '2D and 3D graphics'],
    ],
];
```

Here are some examples of notes that have customized layouts. 
These are like regular notes, but with a trailing slash added to their URLs to activate the embedded code. 
Feel free to modify them to practice or make them your own. 
Unlike your other notes, these will reset to their original content if you fully delete your local copy before saving. 

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

Notes can also hold a summary by putting content above the main heading. 
This isn't shown when viewing the full note, but can be requested in your stew layouts or linked to as a snip by adding an empty hash to the end of the URL. 
It is also what is shown at the top of the home page for the journal note of the current day. 

## Capitalize

```export
const [flags, code] = arguments;
const { all } = flags;
return ['p', null, all ? code.toUpperCase() : `${code[0].toUpperCase()}${code.slice(1)}`];
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
