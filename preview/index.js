(function () {
	let stew;
	
	if (typeof window === 'object') {
		stew = window.stew;
		window.App = App;
	} else {
		stew = require('../dist/stew.min.js');
		module.exports = App;
	}

	const state = stew({
		isInitialized: false,
		dayCount: 0,
		activeDay: 0,
		activeRoom: 0,
		activeRoomName: '',
		activePropName: '',
		report: '',
	});

	function parseLabel (value) {
		const [, name, flags] = value.match(/^\s*(.*?)\s*([NSEWBVOGYR]*)\s*$/);
		return [name, flags];
	}

	function renderIndicators (min, max) {
		return ['div', { className: 'indicators' },
			...Array(min - 1).fill(0).map(() => ['div', { className: 'indicator' }]),
			...Array(max - min + 1).fill(0).map(() => ['div', { className: 'indicator filled' }]),
			...Array(9 - max).fill(0).map(() => ['div', { className: 'indicator' }]),
		];
	}

	function generateReport (days) {
		// 1) check that rooms show the same orientations of doors through the day, and build list of which have fixed rotations
		// - 1: dead end, 2: through, 0: corner, 3: t intersection, 4: cross intersection
		// 2) check that rooms show the same colors, and update any that are missing any (update with the flags of the most recent occurance)

		const doorTypes = {};
		const doors = {};
		const colors = {};
		const notes = {}; // use keys from room notes (parse for label:)

		const names = new Set();
		const counts = {};
		const ranges = {}; // [minColumn, minTier, maxColumn, maxTier]
		const adjacentRooms = {};
		const connectedRooms = {};

		for (let i = days.length - 1; i >= 0; i--) {
			const day = days[i];

			for (const [j, label] of day.entries()) {
				const [name, flags] = parseLabel(label);

				if (!name) {
					continue;
				}

				if (!(name in counts)) {
					counts[name] = 1;
				} else {
					counts[name] += 1;
				}

				const range = ranges[name];
				const column = (j % 5) + 1;
				const tier = Math.floor(j / 5) + 1;
				names.add(name);

				if (!range) {
					ranges[name] = [column, tier, column, tier];
				} else {
					if (column < range[[0]]) {
						range[0] = column;
					} else if (column > range[2]) {
						range[2] = column;
					}

					if (tier < range[1]) {
						range[1] = tier;
					} else if (tier > range[3]) {
						range[3] = tier;
					}
				}


				const set = [...new Set(flags.split(''))];
				const doorFlags = set.filter(flag => /[NSEW]/.test(flag)).sort();
				const colorFlags = set.filter(flag => /[ROYGBV]/.test(flag)).sort();
				const doorString = doorFlags.join('');
				const doorType = `${doorFlags.length}${doorString.length !== 2 ? '' : doorString === 'NS' || doorString === 'EW' ? 'l' : 'c'}`;
				
				if (!doorTypes[name]) {
					doorTypes[name] = doorType;
				} else if (doorTypes[name] !== doorType) {
					console.error(`Mismatched door configuration: Day ${days.length - i}, Tile ${j}, ${name}, ${doorTypes[name]} -> ${doorType}`);
				}

				if (!colorFlags.length) {
					if (!colors[name]) {
						console.error(`Unknown room color: Day ${days.length - i}, Tile ${j}, ${name}`);
					} else {
						colorFlags.push(...colors[name]);
					}
				}

				if (colorFlags.length) {
					colors[name] = colorFlags;
				}

				doors[name] = doorFlags;
				day[j] = `${name} ${doorString}${colorFlags.join('')}`;
			}
		}

		return ['', {},
			...[...names].sort().map(name => {
				const range = ranges[name];

				return ['', {},
					['h3', {},
						name,
						['div', {},
							renderIndicators(range[0], range[2]),
							renderIndicators(range[1], range[3]),
						],
						counts[name],
					],
				];
			}),
		];
	}

	function App () {
		const { isInitialized, dayCount, activeDay, activeRoom, activeRoomName, activePropName, report } = state;

		stew(stew, [], () => {
			state.isInitialized = true;
		});

		// array of days with tiers, then rooms
		const [days, tiles, rooms] = stew(() => {
			if (!isInitialized) {
				return [[[]], [], {}];
			}

			const days = JSON.parse(window.localStorage.getItem('days') || '[[]]');
			const tiles = JSON.parse(window.localStorage.getItem('tiles') || '[]');
			const rooms = JSON.parse(window.localStorage.getItem('rooms') || '{}');
			return [days, tiles, rooms];
		}, [isInitialized]);

		const tilePropNames = stew(() => {
			if (!isInitialized) {
				return [];
			}

			return [...new Set(tiles.map(tile => tile ? Object.keys(tile) : []).flat())];
		}, [isInitialized]);

		const grid = days[activeDay];
		const tiers = [];
		const roomRef = [];
		const textareaRef = [];
		const text = rooms[activeRoomName] || '';

		// TODO: figure out why text isn't being switched out properly with text as child in layout
		// - is it just textarea, or is it all elements?
		stew(stew, [text], () => {
			const [textarea] = textareaRef;

			if (textarea) {
				textarea.value = text;
			}
		});

		function updateNotes () {
			const [textarea] = textareaRef;

			if (activePropName || !textarea) {
				return;
			}

			const roomText = textarea.value.trim();

			if (roomText) {
				rooms[activeRoomName] = roomText;
			} else {
				delete rooms[activeRoomName];
			}
		}

		for (let i = 0; i < 45; i += 5) {
			const rooms = [];

			for (let j = i; j < i + 5; j++) {
				const value = ((activePropName ? tiles[j]?.[activePropName] : grid[j]) || '').trim();
				let className = value ? '' : 'empty';

				if (value && !activePropName) {
					const [, flags] = parseLabel(value);
					className = [...new Set(flags.split(''))].join(' ').toLowerCase();
				}

				rooms.push(['td', { className },
					['input', {
						ref: roomRef,
						type: 'text',
						value,
						onfocus: () => {
							const { value } = roomRef[j];
							updateNotes();
							state.activeRoom = j;
							state.activeRoomName = activePropName ? value : parseLabel(value)[0];
						},
						onblur: () => {
							const { value } = roomRef[j];

							if (!activePropName) {
								grid[j] = value;
							} else {
								if (!tiles[activeRoom]) {
									tiles[activeRoom] = {};
								}

								tiles[activeRoom][activePropName] = value;
							}
						},
					}],
				]);
			}

			tiers.push(['tr', {}, ...rooms]);
		}

		return ['', {},
			['div', { className: 'buttons' },
				['button', {
					type: 'button',
					disabled: activeDay >= days.length - 1,
					onclick: () => state.activeDay += 1,
				}, 'Previous Day'],
				['button', {
					type: 'button',
					className: report ? 'active' : '',
					onclick: () => {
						if (report) {
							state.report = '';
						} else {
							state.report = generateReport(days);
						}
					},
				}, 'View Report'],
				['div', {},
					`Day ${days.length - activeDay}`,
					['button', {
						type: 'button',
						onclick: () => {
							days.splice(activeDay, 1);
							state.dayCount = days.count;
							state.activeDay = Math.max(0, state.activeDay - 1);
						},
					}, '✕'],
				],
				['button', {
					type: 'button',
					onclick: () => {
						window.localStorage.setItem('days', JSON.stringify(days));
						window.localStorage.setItem('tiles', JSON.stringify(tiles));
						window.localStorage.setItem('rooms', JSON.stringify(rooms));
					},
				}, 'Save Changes'],
				activeDay === 0
					? ['button', {
						type: 'button',
						onclick: () => {
							days.unshift([]);
							state.dayCount += 1;
						},
					}, 'New Day']
					: ['button', {
						type: 'button',
						onclick: () => state.activeDay -= 1,
					}, 'Next Day'],
			],
			['table', {}, ...tiers],
			report || ['h2', {}, activeRoomName],
			!report && !activePropName && activeRoomName && ['textarea', {
				ref: textareaRef,
				onfocus: () => {
					if (activeRoom === undefined) {
						return;
					}

					const { value } = roomRef[activeRoom];
					state.activeName = parseLabel(value)[0];
				},
				onblur: () => {
					updateNotes();
				},
			}, rooms[activeRoomName] || ''],
			['div', {},
				...tilePropNames.map(name => ['button', {
					type: 'button',
					className: name === activePropName ? 'active' : '',
					onclick: () => state.activePropName = name === activePropName ? '' : name,
				}, name]),
				['input', {
					placeholder: 'New tile prop',
					onblur: ({ target }) => {
						const name = target.value.trim();

						if (tilePropNames.indexOf(name) === -1) {
							tilePropNames.push(name);
							state.activePropName = name;
						}
					},
				}],
			],
		];
	}
})();
