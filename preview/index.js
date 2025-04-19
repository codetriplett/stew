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
		showNotes: false,
		dayCount: 0,
		activeDay: 0,
		activeName: '',
	});

	function parseLabel (value) {
		const [, name, flags] = value.match(/^\s*(.*?)\s*([NSEWBVOGYR]*)\s*$/);
		return [name, flags];
	}

	function App () {
		const { isInitialized, showNotes, dayCount, activeDay, activeRoom, activeName } = state;

		stew(stew, [], () => {
			state.isInitialized = true;
		});

		// array of days with tiers, then rooms
		const [days, rooms] = stew(() => {
			if (!isInitialized) {
				return [[[]], {}];
			}

			const days = JSON.parse(window.localStorage.getItem('days') || '[[]]');
			const rooms = JSON.parse(window.localStorage.getItem('rooms') || '{}');
			return [days, rooms];
		}, [isInitialized]);

		const grid = days[activeDay];
		const tiers = [];
		const roomRef = [];
		const textareaRef = [];
		const name = grid[activeRoom] || '';
		const text = rooms[name] || '';

		// TODO: figure out why text isn't being switched out properly with text as child in layout
		// - is it just textarea, or is it all elements?
		stew(stew, [text], () => {
			const [textarea] = textareaRef;

			if (textarea) {
				textarea.value = text;
			}
		});

		function updateNotes () {
			if (!showNotes) {
				return;
			}

			const text = textareaRef[0].value.trim();

			if (text) {
				rooms[activeName] = text;
			} else {
				delete rooms[activeName];
			}
		}

		for (let i = 0; i < 45; i += 5) {
			const rooms = [];

			for (let j = i; j < i + 5; j++) {
				const value = (grid[j] || '').trim();
				const [name, flags] = parseLabel(value);
				const className = name ? [...new Set(flags.split(''))].join(' ').toLowerCase() : 'empty';

				rooms.push(['td', { className },
					['input', {
						ref: roomRef,
						type: 'text',
						value,
						onfocus: () => {
							const { value } = roomRef[j];
							updateNotes();
							state.activeRoom = j;
							state.activeName = parseLabel(value)[0];
							state.showNotes = true;
						},
						onblur: () => {
							const { value } = roomRef[j];
							grid[j] = value;
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
					onclick: () => {
						days.splice(activeDay, 1);
						state.dayCount = days.count;
						state.activeDay = Math.max(0, state.activeDay - 1);
					},
				}, `Delete Day ${days.length - activeDay}`],
				['button', {
					type: 'button',
					onclick: () => {
						const grid = roomRef.map(inputRef => inputRef.value);
						days[activeDay] = grid;
						const validRooms = {};
						updateNotes();

						for (const value of grid) {
							const [name] = parseLabel(value);
							validRooms[name] = rooms[name];
						}

						window.localStorage.setItem('days', JSON.stringify(days));
						window.localStorage.setItem('rooms', JSON.stringify(validRooms));
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
			['textarea', {
				ref: textareaRef,
				onfocus: () => {
					const { value } = roomRef[activeRoom];
					state.activeName = parseLabel(value)[0];
					state.showNotes = true;
				},
				onblur: () => {
					updateNotes();
				},
			}, showNotes ? rooms[activeName] : ''],
		];
	}
})();
