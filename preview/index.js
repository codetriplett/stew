function render ($, node) {
	function Button ({ '': state, action, locked, id }, content) {
		const { number = 0 } = state();
		console.log(id, 'rendered');

		return $('button', {
			onclick: () => action ? action() : state({ number: number + 1 }),
			disabled: locked
		},
			content,
			!!number && ` (${number})`,
			locked && ' (locked)'
		);
	}

	function Component ({ '': state }) {
		const { locked = false } = state();

		return [
			// $(Button, {
			// 	id: 'dial'
			// }, 'Input'),
			$(Button, {
				action: () => state({ locked: true }),
				id: 'lock',
				locked
			}, 'Lock'),
			locked && $(Button, {
				action: () => state({ locked: false }),
				id: 'key'
			}, 'Unlock')
		];
	}

	const element = $(Component, {}, []);
	return node ? element(node) : element;
}

if (typeof define === 'function' && define.amd) {
	define(function () { return render; });
} else if (typeof module !== 'undefined' && module.exports) {
	module.exports = render;
} else if (typeof window === 'object' && window.document) {
	window.render = render;
}
