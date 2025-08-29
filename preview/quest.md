```export
{
    '': '/quest// Choose a quest',
    quest: 'Quest //',
    exp: 'EXP /0..100..',
    type: ['Type / Home (organize)',
        'Mind (visualize) / mind',
        'Body (exercise) / body',
        'Soul (socialize) / soul',
    ],
    complete: 'Complete',
}
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
.cards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
}
```

# Quest

[](/index#card)

```export
const [props, content, navigation] = arguments;

if (content) {
    const name = window.location.pathname.replace(/\/+$/, '').split('/').pop();

    if (navigation && /^\d{8}$/.test(name)) {
        navigation[2] = [card, { forNav: true, markDay: true }, name];
    }

    return content;
}

const date = new Date();
const year = date.getFullYear();
const month = date.getMonth() + 1;
const day = date.getDate();
const todayString = `${year}${month < 10 ? '0' : ''}${month}${day < 10 ? '0' : ''}${day}`;

const state = stew({
    seasonOffset: Math.round(date.getMonth() / 3) % 4,
}, []);

const cards = ['div', { className: 'cards' }];
const { seasonOffset } = state;
const season = ((seasonOffset % 4) + 4) % 4;
date.setMonth(seasonOffset * 3);
date.setDate(-39);

for (let i = 0; i < 15; i++) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateString = `${year}${month < 10 ? '0' : ''}${month}${day < 10 ? '0' : ''}${day}`;
    date.setDate(date.getDate() + 7);
    cards.push([card, { allowedSeason: season, markDay: dateString === todayString }, dateString])
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
            onclick: () => state.seasonOffset -= 1,
        }, '〈'],
        ['h1', null, `${labels[0]} ${date.getFullYear()}`],
        ['button', {
            type: 'button',
            onclick: () => state.seasonOffset += 1,
        }, '〉'],
    ],
    cards,
];
```
