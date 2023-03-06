function Button ({ action, locked, id }, content) {
	return [
		'', action ? null : {
			number: 0,
			setNumber (number) {
				this.number = number;
			}
		},
		({ number, setNumber }) => ['button', {
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
	return [
		'', {
			locked: false,
			setLocked (locked) {
				this.locked = locked;
			}
		},
		({ locked }) => ['', null,
			['i', {}, 'Status is: '],
			['b', {}, locked ? 'Locked' : 'Not locked'],
		],
		({ setLocked }) => [
			'', null,
			Button({ id: 'dial' }, 'Dial'),
			Button({
				id: 'lock',
				action: () => setLocked(true),
			}, 'Lock'),
			// TODO: why is there an endless loop when fn is removed and boolean value false sits before Button
			({ locked }) => locked && Button({
				id: 'unlock',
				action: () => setLocked(false),
			}, 'Unlock'),
		],
	];
}

stew('#container', Component);
