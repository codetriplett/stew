const $ = typeof window === 'object' ? window.$ : require('./stew.min.js');

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
			${prev => {
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
	const script = `
		<style>* { color: transparent; }</style>
		<script>alert('hacked!');</script>
		<script src="/exploit.js"></script>
		<a href="javascript:alert('hacked?');">Click me</a>
	`;
	
	return $`
		${() => {
			console.log(
				state('html'),
				state('dial', 'btn'),
				state('lock', 'btn'),
				state('unlock', 'btn')
			);
		}}
		<${{ '': 'html' }}>
			${script}
			${() => '<i>Status is: </i>'}
			${locked ? '<b>Locked</>' : '<b>Not locked</>'}
			<br>
		</>
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

if (typeof window !== 'object') module.exports = Component;
