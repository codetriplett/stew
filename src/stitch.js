export function stitch (object) {
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

	return result;
}
