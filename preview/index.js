function render ($, node) {
	function Button ({
		'': { '': state, number = 0 },
		action, locked, id
	}, content) {
		return $`
			<button
				${{ '': 'btn' }}
				onclick=${() => action ? action() : state({ number: number + 1 })}
				disabled=${locked}
			>
				${({ '': prev }) => {
					console.log(id, prev ? 'updated' : 'created');
					return () => console.log(id, 'removed');
				}}
				${content}
				${!!number && ` (${number})`}
				${locked && ' (locked)'}
			</>
		`;
	}

	function Component ({ '': { '': state, locked = false } }) {
		return $`
			${() => {
				console.log(
					state('dial', 'btn'),
					state('lock', 'btn'),
					state('unlock', 'btn')
				);
			}}
			<${Button} ${{ '': 'dial' }} id="dial">Dial</>
			<${Button}
				${{ '': 'lock', locked }}
				id="lock"
				action=${() => state({ locked: true })}
			>
				Lock
			</>
			${locked && $`<${Button}
				${{ '': 'unlock' }}
				id="unlock"
				action=${() => state({ locked: false })}
			>
				Unlock
			</>`}
		`;
	}

	return $({ '': node || 'div' }, $`<${Component}>`);
}

if (typeof define === 'function' && define.amd) {
	define(function () { return render; });
} else if (typeof module !== 'undefined' && module.exports) {
	module.exports = render;
} else if (typeof window === 'object' && window.document) {
	window.render = render;
}
