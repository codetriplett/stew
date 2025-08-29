export function capitalize () {
	const [flags, code] = arguments;
	const { all } = flags;
	return ['p', null, all ? code.toUpperCase() : `${code[0]}${code.slice(1)}`];
}

export function render () {
	const [flags, code] = arguments;
	return new Function(code);
}

export function demo () {
	const [{ markdown, form }, code] = arguments;
	let result;

	if (markdown) {
	    result = stew(code, ['/']);
	} else if (form) {
	    const schema = new Function(`return ${code}`)();
	    result = renderForm(schema, undefined, console.log);
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
	    ['div', null, result],
	];
}

export function card () {
	const [props, dateName] = arguments;
	const { allowedSeason, forNav, markDay } = props;

	// extract parts of date string
	const year = dateName.slice(0, 4);
	const month = dateName.slice(4, 6);
	const day = dateName.slice(6, 8);

	// create date for input string and first week of year it exists in
	// then adjust them to the start of their respective weeks
	const start = new Date(`${year - (month < 12 ? 1 : 0)}-11-30T00:00:00`);
	start.setDate(30 - start.getDay());
	const focus = new Date(`${year}-${month}-${day}T00:00:00`);
	focus.setDate(Number(day) - focus.getDay());

	// calculate the number of weeks between the dates, along with the season
	// ensure the week the contains 11/30 is always the first week
	const week = focus.getMonth() === 10 && focus.getDate() > 23 ? 0
	    : Math.round((focus - start) / (7 * 24 * 60 * 60 * 1000));
	const season = Math.min(3, Math.floor(week / 13));

	if ('allowedSeason' in props && season !== allowedSeason) {
	    return;
	}

	// render card layout, fetching the quest data for each day
	const card = ['ul', {
	    className: `card season-${season} week-${week % 13} ${forNav ? 'nav-card' : ''}`,
	}];

	const locale = Intl.DateTimeFormat().resolvedOptions().locale;
	const list = stew(fetchList, ['/quest'], []);

	for (let j = 0; j < 7; j++) {
	    const year = focus.getFullYear();
	    const month = focus.getMonth() + 1;
	    const day = focus.getDate();
	    const questName = `${year}${month < 10 ? '0' : ''}${month}${day < 10 ? '0' : ''}${day}`;
	    const href = `/quest/${questName}`;
	    const data = list.indexOf(questName) !== -1 ? stew(fetchData, [href], {}) : {};
	    const textProps = { className: 'quest' };
	    let { quest = '', exp = 0, type = 'home', complete } = data;
	    focus.setDate(Number(day) + 1);

	    if (!quest && day === 1) {
	        quest = new Intl.DateTimeFormat(locale, { month: 'long' }).format(focus);
	        textProps.style = { fontSize: quest.length > 10 ? '11px' : '15px', fontWeight: 'bold' };
	    }

	    card.push(['li', markDay && questName === dateName ? { className: 'today' } : null,
	        ['span', null, day],
	        ['a', { href },
	            ['span', textProps, quest],
	            complete && ['span', { className: `exp exp-${type}` }, `+${exp}`],
	        ],
	    ]);
	}

	return card;
}

export default [null, {
    '': 'quest',
    smile: '🙂',
}, ['style', null, `
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
        }
        > button:last-child {
            display: none;
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
        &:nth-child(-n + 2) > span,
        &:nth-child(n + 6) > span {
            visibility: hidden;
        }
        + li {
            margin-top: 2px;
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
            
            span {
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
}
.season-0:before { background-image: url(/winter-cards.png); }
.season-1:before { background-image: url(/spring-cards.png); }
.season-2:before { background-image: url(/summer-cards.png); }
.season-3:before { background-image: url(/autumn-cards.png); }
.week-12 + .week-0:before { background-image: url(/joker-card.png); }
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
.nav-card { margin: 8px; transform: scale(1.5); }
.today { box-shadow: inset 0 0 2px 2px black; }
.quest { display: block; width: 100%; font-size: 11px; }
.exp {
    border-radius: 4px;
    padding: 0 4px;
    font-size: 15px;
    font-weight: bold;
    background: #fffd;
    box-shadow: 0 0 4px 4px #fffd;
}
.exp-home { color: #b93; }
.exp-mind { color: #33b; }
.exp-body { color: #b33; }
.exp-soul { color: #3b3; }
`]];
