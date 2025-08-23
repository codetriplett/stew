export function custom () {
	const [flags, code] = arguments;
	return `CUSTOM\n${code}`;
}

export function render () {
	const [flags, code] = arguments;
	return new Function(code);
}

export function demo () {
	const [{ markdown }, code] = arguments;

	const lines = markdown ? [code] : code.split(/\r\n|\r|\n/).map(line => {
	    const [, text, comment] = line.match(/^(.*?)(?:\s*\/\/\s*([+-]))?\s*$/);

	    return ['div', {
	        style: comment && { backgroundColor: comment === '-' ? 'rgba(191, 63, 63, 0.125)' : 'rgba(63, 191, 63, 0.125)' },
	    }, text || ' '];
	});

	return ['div', {
	    className: 'stew-demo',
	    style: { display: 'flex', gap: '16px' },
	},
	    ['style', null, `
	        .stew-demo canvas {
	            width: 100%;
	        }
	        @media (max-width: 720px) {
	            .stew-demo {
	                display: block !important;

	                > *  + * {
	                    margin-top: 16px;
	                }
	            }
	        }
	    `],
	    ['div', {
	        style: { flex: '3 1 0', overflowX: 'auto', fontFamily: 'monospace', whiteSpace: 'pre' },
	    },
	        ...lines,
	    ],
	    ['div', {
	        style: { flex: '2 1 0', overflowX: 'auto', padding: '16px', background: 'var(--page-background)' },
	    }, markdown ? stew(code, ['/']) : new Function(code)],
	];
}

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
	return ['', {},
	    ['style', null, `
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
	        .cards-nav {
	            display: block;
	            width: 216px;
	            height: 306px;
	            margin: 8px auto;
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
	            box-shadow: inset 0 0 2px 2px black;
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
	            max-height: 22px;
	            line-height: 11px;
	            transform: translate(-50%, -50%);
	            -webkit-line-clamp: 2;
	            text-overflow: ellipsis;
	            font-family: monospace;
	        }
	        .quest {
	            display: block;
	            width: 100%;
	            font-size: 11px;
	        }
	        .exp {
	            border-radius: 4px;
	            padding: 0 4px;
	            font-size: 15px;
	            font-weight: bold;
	            background: #fffd;
	            box-shadow: 0 0 4px 4px #fffd;
	        }
	        .exp-home {
	            color: #b93;
	        }
	        .exp-mind {
	            color: #33b;
	        }
	        .exp-body {
	            color: #b33;
	        }
	        .exp-soul {
	            color: #3b3;
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
		['div', { className: 'cards' }, () => {
			const [todayName, startName, count = 7] = arguments;
			const year = startName.slice(0, 4);
			const start = getDay(year) - (count > 7 ? 28 : 0);
			let index = getDay(startName) - (count > 7 ? 28 : 0);
			index -= (index - start) % 7;
			let week = Math.floor((index - start) / 7) + (count > 7 ? 0 : 4);
			const season = Math.floor(week / 13);
			const locale = Intl.DateTimeFormat().resolvedOptions().locale;
			const cards = ['', null];

			switch (week % 13) {
				case 1: {
					week -= 1;
					break;
				}
				case 12: {
					week += 1;
					break;
				}
			}

			for (let i = 0; i < count; i += 7) {
				const card = ['ul', { className: `card season-${season} week-${week % 13}` }];
				cards.push(card);
				week++;

				for (let j = 0; j < 7; j++) {
					const date = new Date(index * 24 * 60 * 60 * 1000);
					const year = date.getFullYear();
					const month = date.getMonth() + 1;
					const day = date.getDate();
					const name = `${year}${month < 10 ? '0' : ''}${month}${day < 10 ? '0' : ''}${day}`;
					const href = `/index/${name}`;
					const data = stew(fetchData, [href], {});
					const textProps = { className: 'quest' };
					let { quest = '', exp = 0, type = 'home', complete } = data;
					index++;

					if (!quest && day === 1) {
						quest = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
						textProps.style = { fontSize: quest.length > 10 ? '11px' : '15px', fontWeight: 'bold' };
					}

					card.push(['li', name === todayName ? { className: 'today' } : null,
						['span', null, day],
						['a', { href },
							['span', textProps, quest],
							complete && ['span', { className: `exp exp-${type}` }, `+${exp}`],
						],
					]);
				}
			}
	    
			return cards;
		}],
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
	    stew(getQuests, [todayName, startName, 91]),
	];
}

export default [calendar, {
    '': {
        '': 'Calendar /index// Make a quest',
        smile: '🙂',
    },
    quest: 'Quest //',
    exp: 'EXP /0..100..',
    type: ['Type / Select a type...',
        'Mind (visualize) / mind',
        'Body (exercise) / body',
        'Soul (socialize) / soul',
    ],
    complete: 'Complete',
}];
