import { card } from '/index.mjs';

export function quest () {
	const [props, content, navigation] = arguments;

	if (content) {
	    const name = window.location.pathname.replace(/\/+$/, '').split('/').pop();

	    if (navigation && /^\d{8}$/.test(name)) {
	        navigation[2] = [card, { forNav: true, markDay: true }, name];
	    }

	    return content;
	}

	const [todayName, initialYear, initialSeason] = stew(() => {
	    const date = new Date();
	    const year = date.getFullYear();
	    const month = date.getMonth() + 1;
	    const day = date.getDate();
	    const todayName = `${year}${month < 10 ? '0' : ''}${month}${day < 10 ? '0' : ''}${day}`;
	    const weekName = card({ nameOnly: true }, todayName);
	    const season = Math.min(3, Math.floor(Number(weekName.slice(4, 6)) / 13));
	    return [todayName, Number(weekName.slice(0, 4)), season];
	}, []);

	const state = stew({
	    year: initialYear,
	    season: initialSeason,
	}, []);

	const cards = ['div', { className: 'cards' }];
	const { year, season } = state;
	const start = season * 13 - (season === 0 ? 2 : 1);
	const finish = start + 18;

	for (let week = start; week < finish; week++) {
	    cards.push([card, { todayName },
	        week <= 0 ? `${year - 1}${week + 53}`
	        : week > 53 ? `${year + 1}0${week - 53}`
	        : `${year}${week < 10 ? '0' : ''}${week}`
	    ])
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
	            },
	        }, '〉'],
	    ],
	    cards,
	];
}

export default [quest, {
    '': 'Quest /quest// Choose a quest',
    quest: 'Quest //',
    exp: 'EXP /0..100..',
    type: ['Type / Home (organize)',
        'Mind (visualize) / mind',
        'Body (exercise) / body',
        'Soul (socialize) / soul',
    ],
    complete: 'Complete',
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
.cards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
}
`]];
