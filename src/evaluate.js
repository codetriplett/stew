export function evaluate (expression, state, name = '') {
	let value = expression;

	if (!name) {
		return value;
	}
	
	return ` ${name}="${value}"`;
}
