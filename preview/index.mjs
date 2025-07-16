export function getDay () {
	const [name] = arguments;
	let date = new Date();
	date.setFullYear(name.slice(0, 4));
	date.setMonth((name.slice(4, 6) || 1) - 1);
	date.setDate(name.slice(6) || 1);
	const offset = date.getTimezoneOffset();
	const day = name.length > 6 ? 0 : date.getDay();
	date -= (offset + (day < 4 ? day : day - 7) * 24 * 60) * 60 * 1000;
	return Math.floor((date - new Date(0)) / (24 * 60 * 60 * 1000)) + 1;
}

export function getText () {
	const [node] = arguments;

	if (typeof node === 'string') {
	    return node;
	}

	return node[0] === 'br' ? ' ' : node.slice(2).map(getText).join('');
}

export function getQuests () {
	const [todayName, startName, count = 7] = arguments;
	const cards = [];
	const year = startName.slice(0, 4);
	const start = getDay(year);
	let index = getDay(startName);
	index -= (index - start) % 7;
	let week = Math.floor((index - start) / 7);

	for (let i = 0; i < count; i += 7) {
	    const card = ['ul', { className: `card season-${Math.floor(week / 13)} week-${week % 13}` }];
	    cards.push(card);
	    week++;

	    for (let j = 0; j < 7; j++) {
	        const date = new Date(index * 24 * 60 * 60 * 1000);
	        const year = date.getFullYear();
	        const month = date.getMonth() + 1;
	        const day = date.getDate();
	        const name = `${year}${month < 10 ? '0' : ''}${month}${day < 10 ? '0' : ''}${day}`;
	        const href = `/index/${name}`;
	        const [, quest] = (localStorage.getItem(`${href}.md`) || '').match(/^\s*(.*?)\s*(?=#+\s|\r|\n|$)/);
	        const content = stew(quest, [href]);
	        const text = getText(content?.[2] || '');
	        index++;

	        card.push(['li', name === todayName ? { className: 'today' } : null,
	            ['span', null, day],
	            ['a', { href },
	                ['span', null, text],
	            ],
	        ]);
	    }
	}

	return ['', null,
	    ['style', null, `
	        .cards {
	            display: flex;
	            flex-wrap: wrap;
	            justify-content: center;
	            gap: 4px;
	        }
	        .cards-nav {
				display: block;
	            width: 216px;
				height: 306px;
				margin-bottom: 8px;
	        }
	        .cards-nav .card {
	            transform: scale(1.5);
	        }
	        .card {
	            float: left;
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
	        }
			.today {
				box-shadow: inset 0 0 4px 2px black;
			}
	        .card li {
	            display: flex;
	            gap: 4px;
	            height: 24px;
	            overflow: hidden;
	        }
	        .card li + li {
	            margin-top: 2px;
	        }
	        .card li > span {
	            flex: 0 0 24px;
	            font-weight: bold;
	            font-size: 12px;
	            line-height: 24px;
	            color: #555;
	        }
	        .card a {
	            flex: 1 1 0;
	            position: relative;
	            color: #333;
	        }
	        .card a span {
	            position: absolute;
	            left: 50%;
	            top: 50%;
	            display: block;
	            width: 100%;
	            max-height: 30px;
	            font-size: 13px;
	            line-height: 11px;
	            transform: translate(-50%, -50%);
	            -webkit-line-clamp: 2;
	            text-overflow: ellipsis;
	        }
	        .card li:nth-child(4) > span {
	            display: none;
	        }
	        .card li:nth-child(n + 5) {
	            flex-direction: row-reverse;
	        }
	        .card li:nth-child(-n + 2) > span,
	        .card li:nth-child(n + 6) > span {
	            visibility: hidden;
	        }
	        .card:before {
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
	        .season-0:before { background-image: url(/winter-cards.png); }
	        .season-1:before { background-image: url(/spring-cards.png); }
	        .season-2:before { background-image: url(/summer-cards.png); }
	        .season-3:before { background-image: url(/autumn-cards.png); }
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
	    `],
	    ['div', { className: 'cards' }, ...cards],
	];
}

export function calendar () {
	const [props, content, navigation] = arguments;
	const date = new Date();
	let sessions, settings;

	try {
	    sessions = JSON.parse(localStorage.getItem('/'));
	    settings = sessions[1] || {};
	} catch (err) {
	    settings = {};
	    sessions = [0, settings];
	}

	if (props) {
	    const name = window.location.pathname.replace(/\/+$/, '').split('/').pop();

	    if (navigation && /^\d{8}$/.test(name)) {
	        const cards = stew(getQuests, [name, name]);
	        cards[3][1].className += ' cards-nav';
	        navigation.push(cards);
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

	const cards = stew(getQuests, [todayName, startName, 98]);
	const container = cards[3];
	const [season] = container[3][1].className.match(/(?:^|\s)season-.*?(?:\s|$)/);

	// TODO: see if these can be handled in getQuest when startName is yyyymm
	// - needs to find a day name that lies in the first week card of that month
	if (container[2][1].className.indexOf(season) === -1) {
	    container.splice(2, 1);
	} else if (container.length > 15 && container[15][1].className.indexOf(season) === -1) {
	    container.splice(15, 1);
	}

	const currentButton = ['button', {
		type: 'button',
		disabled: seasonOffset === 0,
		onclick: () => state.seasonOffset = 0,
	}, 'Current'];
	
	// TODO: Shift months so Decmber is part of winter
	// - The actual change in season occurs near the end of the first month in each
	// - these also feel a little more natural
	// - need to find a new reference point than Jan 1st
	// - maybe stick to ISO week days, but shift season boundaries by 4 weeks (e.g. winter is weeks 49, 50, 51, 52, 1, 2, 3, 4, ...)
	// - basically just need add 4 to zero-indexed month and % 12 when calculating the season number
	const labels = [
		['Winter', 'December', 'January', 'February'],
		['Spring', 'March', 'April', 'May'],
		['Summer', 'June', 'July', 'August'],
		['Autumn', 'September', 'October', 'November'],
	][Math.floor(startName.slice(4, 6) / 3)];

	// TODO: rework cards so the symbols line up with the season (also maybe shorten heart a little vertically)
	// - winter: blue diamond
	// - spring: green clover (clubs)
	// - summer: red heart
	// - autumn: orange leaf (spade)
	return ['', null,
		['div', { className: 'header' },
			seasonOffset > 0 && currentButton
			['button', {
				type: 'button',
				onclick: () => state.seasonOffset -= 1,
			}, 'Prev'],

			['button', {
				type: 'button',
				onclick: () => state.seasonOffset += 1,
			}, 'Next'],
			seasonOffset < 0 && currentButton,
		],
	    cards,
	];
}

// TODO: allow fields here
// - use static fields (ones that aren't strings, or no / in them as emoji)
// - maybe allow other wrapper pages to override emoji and exports
// - it would need to fetch all the modules upfront and merge them before calling first stew though
// - it would be nice to create partitions that can experiment with different formatters though
export default [calendar, {
    '': {
		'': 'Calendar',
    	smile: '🙂',
	},
}];
