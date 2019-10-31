export function reduce (input, callbacks) {
	if (!callbacks.length) {
		return input;
	} else if (input instanceof Promise) {
		return input.then(value => reduce(value, callbacks));
	}

	const callback = callbacks.pop();
	const output = callback(input, callbacks.length);

	if (output instanceof Promise) {
		return output.then(value => reduce(value, callbacks));
	}

	return reduce(output, callbacks);
}
