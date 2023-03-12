function Button ({ action, locked, id }, content) {
	return [
		`:${id}`, action ? null : {
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
		// TODO: fix error when this function and its child both are triggered the same property
		// - child function isn't being removed from queue
		({ setLocked }) => [
			'', null,
			Button({ id: 'dial' }, 'Dial'),
			Button({
				id: 'lock',
				action: () => setLocked(Math.random()),
			}, 'Lock'),
			({ locked }) => locked && ['', (refs, prev) => {
				console.log(refs, 'from', prev?.locked, 'to', locked);
				console.log(`unlock button ${prev ? 'updated' : 'added'}`);
				return Object.assign(() => console.log('unlock button removed'), { locked });
			}, Button({
				id: 'unlock',
				action: () => setLocked(false),
			}, 'Unlock')],
		],
	];
}

stew('#container', Component);
