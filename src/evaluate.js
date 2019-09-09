export function evaluate (query, state, value) {
	const [key, comparison] = query;
	const compare = query.length > 1;

	if (typeof strings === 'function') {
		switch (previous) {
			case 'onclick':
				return () => {
					state[key] = !state[key];
					strings();
				}
			default:
				return () => {};
		}
	}

	if (Array.isArray(previous)) {
		const value = state[key];

		if (compare) {
			const fallback = typeof previous[0] === 'string' ? '' : false;
			const item = previous.length ? previous.shift() : true;

			return value === comparison && item || fallback;
		}

		return typeof value !== 'boolean' ? value : undefined;
	} else if (strings.length) {
		let suffix = '';

		for (const string of strings) {
			const index = previous.lastIndexOf(string);

			if (index !== -1) {
				suffix = previous.slice(index + string.length);
				break;
			}
		}

		previous = suffix;
	}
	
	if (!previous) {
		return compare ? false : '';
	}

	state[key] = compare ? comparison : previous;
	return previous;
}
