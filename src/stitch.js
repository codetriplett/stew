function merge (defaults, updates) {
	if (updates === undefined || Array.isArray(defaults)) {
		return defaults;
	} else if (typeof defaults === 'object') {
		const array = Array.isArray(updates) ? updates : [updates];

		for (const updates of array) {
			for (const key in defaults) {
				updates[key] = merge(defaults[key], updates[key]);
			}
		}
	}

	return updates;
}

export function stitch (object, defaults) {
	const result = {};

	for (const chain in object) {
		const value = object[chain];
		const keys = chain.replace(/\.$/, '').split('.');

		keys.reduce((object, key, i) => {
			if (i === keys.length - 1) {
				if (!object.hasOwnProperty(key)) {
					object[key] = value;
				}

				return;
			}

			const indexed = !isNaN(keys[i + 1] || '.');
			let intermediate = object[key];

			if (typeof intermediate !== 'object') {
				intermediate = indexed ? [] : {};
			} else if (Array.isArray(intermediate) && !indexed) {
				intermediate = { ...intermediate };
			}
			
			object[key] = intermediate;

			return intermediate;
		}, result);
	}

	if (defaults) {
		merge(defaults, result);
	}

	return result;
}
