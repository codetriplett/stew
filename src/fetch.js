export function fetch (item, state, value) {
	const [key, comparison] = item;
	const compare = item.length > 1;
	const hydrate = typeof value === 'string';

	if (!hydrate) {
		value = state[key];
	} else if (compare) {
		value = state[key] = comparison;
	} else if (value) {
		value = state[key] = !isNaN(value) ? Number(value) : value;
	}

	if (compare) {
		value = value === comparison;
	} else if (typeof value === 'boolean') {
		value = '';
	}

	return value;
}
