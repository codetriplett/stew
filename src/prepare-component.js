export function prepareComponent (component, state, ...keys) {
	const suffix = ''.padEnd(keys.length + 1, '}');
	const states = [state];
	const expressions = {};
	let prefix = 'with(this){';

	keys.forEach((key, i) => {
		prefix = `with(${key}){${prefix}`;
		states.push(states[i][key]);
	});

	for (const key in component) {
		const expression = `${prefix}return ${component[key]};${suffix}`;
		expressions[key] = Function(...keys, expression);
	}

	return attributes => {
		function update () {
			for (const key in expressions) {
				attributes[key] = expressions[key].call(...states);
			}

			for (const key in state) {
				state[key] = update;
			}
		}
		
		update();
	};
}
