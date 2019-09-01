export function clean (items) {
	const regex = /^\s+|[\n\r\t]+|\s+$/g;

	return items.map(item => {
		if (!Array.isArray(item)) {
			if (typeof item === 'object') {
				Object.keys(item).forEach(key => {
					!item[key].length && delete item[key];
				});
			}

			return item;
		}

		item = item.map(value => {
			if (typeof value !== 'string') {
				return value;
			}

			return value.replace(regex, '').replace(/\s+/g, ' ');
		}).filter(value => value);

		if (item.length) {
			return item;
		}
	}).filter(item => item);
}
