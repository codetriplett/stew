export function prepareComponent (component, state) {
	const expressions = {};

	for (const key in component) {
		const expression = `with (this) { return ${component[key]}; }`;
		expressions[key] = Function(expression).bind(state);
	}

	return attributes => {
		function update () {
			for (const key in expressions) {
				attributes[key] = expressions[key]();
			}
		}
		
		update();

		// this code will exists in a different block of code that iterates through children
		state.one = update;
		state.two = update;
		state.three = update;

		return update;
	};
}
