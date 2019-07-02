export function normalize (value) {
	if (typeof value !== 'object') {
		return value;
	} else if (!Array.isArray(value)) {
		const { '': structure, ...attributes } = value;

		const object = { '': structure.map((item, i) => {
			if (typeof item === 'string') {
				return item.trim();
			}

			return item;
		}) };

		for (const name in attributes) {
			object[name] = normalize(attributes[name]);
		}

		return object;
	}

	const [prefix, key, suffix] = value;

	if (key === undefined) {
		return /^\s+$/.test(prefix) ? undefined : prefix;
	} else if (!prefix && !suffix) {
		return [key];
	}

	value.splice(1, 1);

	return [key, ...value];
}
