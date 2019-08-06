export function fetch (query, state, candidate, remainder) {
	if (typeof query === 'string') {
		if (remainder === undefined) {
			return query;
		} else if (!remainder.startsWith(query)) {
			return remainder;
		}

		return remainder.slice(query.length);
	}

	let [key, comparison] = query;

	if (comparison === '.') {
		comparison = state[comparison];
	}

	const compare = query.length > 1;
	const keys = key.split(key === '.' ? '' : '.');
	let value;

	key = keys.pop();

	const object = keys.reduce((object, key) => {
		if (!object.hasOwnProperty(key)) {
			object[key] = {};
		}

		return object[key];
	}, state);

	if (remainder === undefined) {
		if (key) {
			value = object[key];
		} else if (Array.isArray(object)) {
			value = object.length - 1;
		}

		if (!compare) {
			return value;
		}
		
		value = value === comparison;
		
		return value && candidate || value;
	} else if (typeof remainder === 'function') {
		return event => remainder(object, key, event);
	}

	const index = candidate ? remainder.indexOf(candidate) : -1;
	let prefix = index > -1 ? remainder.slice(0, index) : remainder;

	if (compare) {
		prefix = !prefix && candidate || '';
	}

	if (!prefix) {
		return '';
	}

	if (compare) {
		value = comparison;
	} else if (!isNaN(prefix)) {
		value = Number(prefix);
	} else if (prefix === 'true') {
		value = true;
	} else if (prefix === 'false') {
		value = false;
	} else {
		value = prefix;
	}

	if (value !== undefined && !key.endsWith('.')) {
		object[key] = value;
	}

	return remainder.slice(prefix.length);
}
