export function clean (result) {
	const first = result[0];
	const last = result[result.length - 1];
	const length = Array.isArray(last) && last.length - 1;

	if (Array.isArray(first) && typeof first[0] === 'string') {
		first[0] = first[0].replace(/^\s+/, '');
	}

	if (length !== false && typeof last[length] === 'string') {
		last[length] = last[length].replace(/\s+$/, '');
	}

	return result.map(item => {
		if (!Array.isArray(item)) {
			return item;
		}

		item = item.map(value => {
			if (typeof value !== 'string') {
				return value;
			}

			return value.replace(/\n[\n\r\t]*/g, '').replace(/\s+/g, ' ');
		}).filter(value => value);

		if (item.length) {
			return item;
		}
	}).filter(item => item);
}
