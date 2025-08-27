import { card } from '/index.mjs';

export function quest () {
	const [props, content, navigation] = arguments;
	const date = new Date();

	if (content) {
	    const name = window.location.pathname.replace(/\/+$/, '').split('/').pop();

	    if (navigation && /^\d{8}$/.test(name)) {
	        navigation.push([card, { inNav: true, todayName: name }, name]);
	    }

	    return content;
	}

	const state = stew({
	    seasonOffset: 0,
	}, []);

	const { seasonOffset } = state;

	const [todayName, startName] = stew(() => {
	    let year = date.getFullYear();
	    let month = date.getMonth();
	    const day = date.getDate();
	    const todayName = `${year}${month < 9 ? '0' : ''}${month + 1}${day < 10 ? '0' : ''}${day}`;
	    month += seasonOffset * 3;
	    year += Math.floor(month / 12);
	    month = month % 12;
	    month += month < 0 ? 12 : 0;
	    month = month - (month % 3) + 1;
	    return [todayName, `${year}${month < 10 ? '0' : ''}${month}01`];
	}, [seasonOffset]);

	const labels = [
	    ['Winter', 'December', 'January', 'February'],
	    ['Spring', 'March', 'April', 'May'],
	    ['Summer', 'June', 'July', 'August'],
	    ['Autumn', 'September', 'October', 'November'],
	][Math.floor(startName.slice(4, 6) / 3)];

	return ['', null,
	    ['div', { className: 'header' },
	        ['button', {
	            type: 'button',
	            onclick: () => state.seasonOffset -= 1,
	        }, '〈'],
	        ['h1', null, `${labels[0]} ${startName.slice(0, 4)}`],
	        ['button', {
	            type: 'button',
	            onclick: () => state.seasonOffset += 1,
	        }, '〉'],
	    ],
	    [card, { forSeason: true, todayName }, startName],
	];
}

export default [quest, {
    '': 'Quest /quest// Choose a quest',
    quest: 'Quest //',
    exp: 'EXP /0..100..',
    type: ['Type / Select a type...',
        'Mind (visualize) / mind',
        'Body (exercise) / body',
        'Soul (socialize) / soul',
    ],
    complete: 'Complete',
}];
