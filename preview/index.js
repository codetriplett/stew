(function () {
let stew;

if (typeof window === 'object') {
	stew = window.stew;
} else if (typeof module === 'object') {
	stew = require('./stew.min.js');
}

function Button ({ action, locked, id }, content) {
	return [`:${id}`, action ? null : {
		number: 0,
		setNumber (number) {
			this.number = number;
		}
	},
		({ number, setNumber }) => ['button:button', {
			id,
			type: 'button',
			disabled: locked,
			onclick: action || (() => setNumber(number + 1)),
		},
			content,
			!!number && ` (${number})`,
			locked && ' (locked)',
		],
	];
}

function Component () {
	return ['', {
		locked: false,
		setLocked (locked) {
			this.locked = locked;
		}
	},
		({ locked }) => ['', null,
			['i', {}, 'Status is: '],
			['b', {}, locked ? 'Locked' : 'Not locked'],
		],
		({ setLocked }) => ['', null,
			Button({ id: 'dial' }, 'Dial'),
			Button({
				id: 'lock',
				action: () => setLocked(Math.random()),
			}, 'Lock'),
			({ locked }) => locked && ['', ref => {
				const [prev] = ref;
				if (!prev) console.log('unlock button added');
				else console.log(`unlock button updated from ${prev.locked} to ${locked}`);
				return Object.assign(() => console.log('unlock button removed'), { locked });
			},
				Button({
					id: 'unlock',
					action: () => setLocked(false),
				}, 'Unlock')
			],
		],
	];
}

function App (props) {
	return stew('#app', Component(props));
}

if (typeof window === 'object') {
	window.App = App;
} else if (typeof module === 'object') {
	module.exports = App;
}
})();
