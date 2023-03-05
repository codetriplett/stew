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
			({ locked }) => locked && Button({
				id: 'unlock',
				action: () => setLocked(false),
			}, 'Unlock'),
		],
	];
}

const container = document.querySelector('#container');
const node = stew(Component, {}, container, document);
// TODO: figure out why nodes aren't added to root node
// - is it because function add an empty ref for themselves
// - also need to figure out how to update nodes in parent element when function updates that returns a fragment
document.body.appendChild(node);
