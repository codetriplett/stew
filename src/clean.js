export function clean (input, fallback) {
	if (typeof input !== 'object') {
		return input;
	}

	const iterative = Array.isArray(input);
	const output = iterative ? [] : {};
	let populated = false;

	for (const key in input) {
		const value = clean(input[key]);
		const defined = value !== undefined;

		if (defined || iterative) {
			output[key] = value;
			populated = populated || defined;
		}
	}

	return populated ? output : undefined;
}