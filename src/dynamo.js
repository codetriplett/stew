export function dynamo (state, item, ...items) {
	let value = item;
	let compare;

	if (item === true) {
		return dynamo(state, ...items);
	} else if (Array.isArray(item)) {
		const index = item.findIndex(key => typeof key === 'boolean');
		
		compare = index !== -1;

		if (item === false) {
			return dynamo(state, !compare, ...items.slice(1));
		} else if (compare) {
			const expectation = item[index];
			
			value = dynamo(state, item.slice(0, index));

			if (index === item.length - 1) {
				value = value !== undefined && value !== false;
			} else {
				value = value === dynamo(state, item.slice(index + 1));
			}

			value = value === expectation;
		} else {
			value = item.reduce((value, key) => {
				if (typeof key !== 'string') {
					return key;
				} else if (!key) {
					return Array.isArray(value) ? value.length - 1 : undefined;
				} else if (value.hasOwnProperty(key)) {
					return value[key];
				}
			}, state);
		}
	} else if (item === false) {
		return items.length > 1 ? dynamo(state, ...items.slice(1)) : '';
	} else if (typeof item === 'object') {
		return '<element>';
	}

	if (!items.length) {
		return value;
	} else if (compare) {
		return dynamo(state, value, ...items);
	}

	return `${value}${dynamo(state, ...items)}`;
}
