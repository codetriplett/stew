export function state (object, existing) {
	if (typeof object !== 'object') {
		return object;
	} else if (Array.isArray(object)) {
		if (!Array.isArray(existing)) {
			existing = [];
		}

		return object.map(value => {
			return existing.indexOf(value) === -1 ? state(value) : value;
		});
	}

	const original = {};

	for (const key in object) {
		const value = object[key];
		const updaters = [];
		let valueRead = false;

		if (typeof value !== 'function') {
			Object.defineProperty(object, key, {
				get: () => {
					valueRead = true;
					return original[key];
				},
				set: update => {
					const value = original[key];

					if (update === value) {
						return;
					} else if (typeof update !== 'function') {
						original[key] = state(update, value);
						updaters.forEach(updater => updater());

						return;
					}

					updaters = updaters.filter(updater => updater !== update);

					if (valueRead) {
						updaters.push(update);
						valueRead = false;
						
						if (typeof value === 'object') {
							[].concat(value).forEach(value => {
								for (const key in value) {
									value[key] = update;
								}
							});
						}
					}
				},
				enumerable: true
			});

			state(value);
		}

		original[key] = value;
	}

	return object;
}
