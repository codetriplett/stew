export function fetch ([key, flag, comparison], state, value) {
	const compare = flag !== undefined;

	if (value === undefined) {
		value = state[key];

		if (!compare) {
			return value;
		}
		
		value = value !== undefined && value !== null && value !== false;
		return value === flag;
	} else if (!compare) {
		state[key] = value;
		return value;
	} else if (comparison !== undefined) {
		state[key] = comparison;
	}

	return true;
}
