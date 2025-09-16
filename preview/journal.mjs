import { card } from '/index.mjs';
import questModule from '/quest.mjs';

export function journal () {
    const [props, content, widget, path] = arguments;
    const [quest,, questStyle] = questModule;

    if (content) {
        const name = window.location.pathname.replace(/\/+$/, '').split('/').pop();

        if (widget && /^\d{8}$/.test(name)) {
            widget.splice(2, widget.length,
                [card, { forNav: true, markDay: true }, name],
                questStyle,
                [quest, props, true,, path],
            );
        }

        return content;
    }

    const [todayName, weekName, initialSeason] = stew(() => {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const todayName = `${year}${month < 10 ? '0' : ''}${month}${day < 10 ? '0' : ''}${day}`;
        const weekName = card({ nameOnly: true }, todayName);
        const season = Math.min(3, Math.floor(Number(weekName.slice(4, 6) - 1) / 13));
        return [todayName, weekName, season];
    }, []);

    const initialYear = Number(weekName.slice(0, 4));

    const state = stew({
        year: initialYear,
        season: initialSeason,
        body: {},
        home: {},
        soul: {},
        mind: {},
    }, []);

    const cards = ['div', { className: 'cards' }];
    const { year, season, home, mind, body, soul } = state;
    const start = season * 13 + 1;
    const finish = start + (season < 3 ? 13 : 14);

    for (let week = start; week < finish; week++) {
        if (week === 53 && !card({ nameOnly: true }, `${year}53`)) {
            break;
        }

        cards.push([card, { state, todayName }, `${year}${week < 10 ? '0' : ''}${week}`]);
    }

    if (cards.length < 16) {
        const offset = weekName - `${year}${start < 10 ? '0' : ''}${start}`;

        let index = 2;
        let name, onclick;

        if (offset > 5) {
            name = season < 3 ? `${year}${finish}` : `${year + 1}01`;
            index = cards.length;
        } else if (season > 0) {
            name = `${year}${start - 1}`;
        } else {
            const dayName = card({ nameOnly: true }, `${year - 1}53`);
            name = dayName ? `${year - 1}53` : `${year - 1}52`;
        }

        if (year !== initialYear || season !== initialSeason) {
            name = weekName;
            onclick = () => Object.assign(state, { year: initialYear, season: initialSeason });
        }

        cards.splice(index, 0, [card, { onclick }, name]);
    }

    const labels = [
        ['Winter', 'December', 'January', 'February'],
        ['Spring', 'March', 'April', 'May'],
        ['Summer', 'June', 'July', 'August'],
        ['Autumn', 'September', 'October', 'November'],
    ][season];

    return ['', null,
        ['div', { className: 'header' },
            ['button', {
                type: 'button',
                onclick: () => {
                    if (season === 0) {
                        Object.assign(state, { year: year - 1, season: 3 });
                    } else {
                        state.season -= 1;
                    }

                    Object.assign(state, { body: {}, home: {}, soul: {}, mind: {} });
                }
            }, '〈'],
            ['h1', null, `${labels[0]} ${year}`],
            ['button', {
                type: 'button',
                onclick: () => {
                    if (season === 3) {
                        Object.assign(state, { year: year + 1, season: 0 });
                    } else {
                        state.season += 1;
                    }

                    Object.assign(state, { body: {}, home: {}, soul: {}, mind: {} });
                },
            }, '〉'],
        ],
        ['div', { className: 'journal-experience' },
            ...Object.entries({ body, home, soul, mind }).map(([name, map]) => {
                const total = Object.values(map).reduce((total, value) => total + value, 0);

                return ['div', { className: `journal-${name}` },
                    ['div', {
                        className: 'journal-fill',
                        style: { width: `${Math.min(total * 100 / 5000, 100)}%` },
                    }],
                ];
            }),
        ],
        cards,
        ['p', null,
            'Each row above shows the main quest of each day in the season. ',
            'You can set them by clicking on the row to navigate to the note for that day, clicking edit, and expanding the fields in the upper left. ',
            'The ones that you mark complete will show the experience points earned for that day, and will add their total to the bars above the cards. ',
            'Quests are color-coded by focus: Red for body, yellow for home, green for soul, and blue for mind. ',
            'Try to spread your focus evenly to stay well rounded. ',
            'There is also a field on your daily notes to track how many steps you\'ve taken. ',
            'A brown shoe will be awarded for 6000 steps, a running shoe for 9000, and a hiking boot for 15,000. ',
            'This is all meant as a light-hearted motivation tool, so don\'t take things too seriously. ',
            'Good luck on all your goals! ',
        ],
    ];
}

export default [journal, {
    '': 'Journal /quest// Choose a quest',
    steps: 'Steps /0.. Enter step count',
    quests: ['Side Quests /.. Add a quest',
        'Quest /quest// Choose side quest',
    ],
}, ['style', null, `
.header {
    display: flex;
    gap: 32px;
    justify-content: center;
    margin-bottom: 16px;
}
h1 {
    flex: 0 160px;
    margin: 0;
    font-size: 27px;
    line-height: 35px;
    text-align: center;
    white-space: nowrap;
}
.header button {
    flex: 0 0 32px;
    border: none;
    font-size: 27px;
    font-weight: bold;
    color: var(--paper-font-color);
    background: none;
}
.journal-experience {
    margin-bottom: 16px;

    > div { height: 8px; margin-top: 4px; }
}
.journal-body { background: #b333; }
.journal-home { background: #b933; }
.journal-soul { background: #3b33; }
.journal-mind { background: #33b3; }
.journal-body .journal-fill { background: #b33; }
.journal-home .journal-fill { background: #b93; }
.journal-soul .journal-fill { background: #3b3; }
.journal-mind .journal-fill { background: #33b; }
.journal-fill { height: 100%; }
.cards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
}
`]];
