export function evaluate (item, state) {
	if (!Array.isArray(item)) {
		return true;
	}

	const index = item.findIndex(key => typeof key === 'boolean');
	const compare = index !== -1;

	if (state === undefined) {
		return compare;
	} else if (compare) {
		const expectation = item[index];
		let value = evaluate(item.slice(0, index), state);

		if (index === item.length - 1) {
			value = value !== undefined && value !== false;
		} else {
			value = value === evaluate(item.slice(index + 1), state);
		}

		return value === expectation;
	}

	return item.reduce((value, key) => {
		if (typeof key !== 'string') {
			return key;
		} else if (!key) {
			return Array.isArray(value) ? value.length - 1 : undefined;
		} else if (value.hasOwnProperty(key)) {
			return value[key];
		}
	}, state);
}
