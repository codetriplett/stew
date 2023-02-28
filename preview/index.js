function Button ({ action, locked, id }, content) {
	return [
		{
			number: 0,
			setNumber (number) {
				this.number = number;
			}
		},
		['button', {
			id,
			type: 'button',
			disabled: locked,
			onclick: action || setNumber(number + 1),
		},
			content,
			!!number && ` (${number})`,
			locked && ' (locked)',
		],
	];
}

function Component ({ locked = false }) {
	return [
		['',
			['i', 'Status is: '],
			['b', locked ? 'Locked' : 'Not locked'],
		],
		Button({ id: 'dial' }, 'Dial'),
		Button({
			id: 'lock',
			action: () => setLocked(true),
		}, 'Lock'),
		locked && button({
			id: 'unlock',
			action: () => setLocked(false),
		}, 'Unlock'),
	];
}

const render = stew(document);
const node = render(['p', 'Hello Page']);
document.body.appendChild(node);
