export function view (state, ...keys) {
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

	return ({ attributes }) => {
		return () => {
			for (const key in expressions) {
				attributes[key] = expressions[key].call(...states);
			}
		};
	};
}
