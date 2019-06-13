export function state (object, existing) {
	if (typeof object !== 'object') {
		return object;
	} else if (Array.isArray(object)) {
		if (!Array.isArray(existing)) {
			existing = [];
		}

		return object.map(value => {
			const index = existing.indexOf(value);

			if (index === -1) {
				return value;
			}

			return state(value, existing[index]);
		});
	}

	const result = {};

	for (const key in object) {
		const value = object[key];
		const renderers = [];
		let read = false;

		Object.defineProperty(result, key, {
			get: () => {
				read = true;
				return object[key];
			},
			set: value => {
				const existing = object[key];

				if (value === existing) {
					return;
				} else if (typeof value !== 'function') {
					object[key] = state(value, existing);
					renderers.forEach(render => render());

					return;
				}

				renderers = renderers.filter(render => render !== value);

				if (read) {
					renderers.push(value);
					read = false;

					if (typeof value === 'object') {
						[].concat(value).forEach(item => {
							for (const key in item) {
								if (typeof item[key] !== 'function') {
									item[key] = value;
								}
							}
						});
					}
				}
			},
			enumerable: true
		});

		result[key] = value;
	}

	return result;
}
