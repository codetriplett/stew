export function fetch (query, state, value, update) {
	const [key, comparison] = query;
	const compare = query.length > 1;

	switch (value) {
		case 'onclick':
			return () => {
				state[key] = !state[key];
				update();
			}
	}

	if (value === undefined) {
		value = state[key];

		if (compare) {
			return value === comparison;
		}

		return typeof value !== 'boolean' ? value : undefined;
	} else if (value) {
		if (compare) {
			state[key] = comparison;
			return true;
		}

		state[key] = value;
		return value;
	}
}
