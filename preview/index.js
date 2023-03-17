(function () {
let stew;

if (typeof window === 'object') {
	stew = window.stew;
} else if (typeof module === 'object') {
	stew = require('./stew.min.js');
}

const globalState = stew({
	freeze: false,
	setFreeze (freeze) {
		this.freeze = freeze;
	}
});

function Button ({ action, locked, id, disabled }, content) {
	return [`:${id}`, action ? null : {
		number: 0,
		setNumber (number) {
			this.number = number;
		}
	},
		({ number, setNumber }) => ['button:button', {
			id,
			type: 'button',
			disabled: disabled || locked,
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
		['', {
			value: '',
			setValue (value) {
				this.value = value;
			}
		},
			({ value, setValue }) => ['', null,
				['input', {
					type: 'text',
					value,
					onkeyup: event => setValue(event.target.value),
				}],
				['p', null, value],
			]
		],
		({ locked }) => ['', null,
			['i', {}, 'Status is: '],
			['b', {}, locked ? 'Locked' : 'Not locked'],
		],
		({ locked, setLocked }) => ['', null,
			['', [globalState.freeze],
				() => Button({ id: 'dial', disabled: globalState.freeze }, 'Dial'),
			],
			['', [locked],
				() => Button({
					id: 'lock',
					locked,
					action: () => setLocked(true),
				}, 'Lock'),
			],
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

setInterval(() => globalState.setFreeze(!globalState.freeze), 2000);

if (typeof window === 'object') {
	window.App = App;
} else if (typeof module === 'object') {
	module.exports = App;
}
})();
