export function state (object) {
	if (typeof object !== 'object') {
		return object;
	} else if (Array.isArray(object)) {
		return object.map(value => state(value));
	}

	const result = {};

	for (const key in object) {
		const updaters = [];
		let valueRead = false;

		Object.defineProperty(result, key, {
			get: () => {
				valueRead = true;
				return object[key];
			},
			set: update => {
				const value = object[key];

				if (update === value) {
					return;
				} else if (typeof update !== 'function') {
					object[key] = update;
					updaters.forEach(updater => updater());

					return;
				}

				updaters = updaters.filter(updater => updater !== update);
					
				if (valueRead) {
					updaters.push(update);
					valueRead = false;
					
					if (typeof value === 'object') {
						for (const key in value) {
							value[key] = update;
						}
					}
				}
			},
			enumerable: true
		});
		
		if (typeof object[key] === 'object') {
			result[key] = state(object[key]);
		}
	}

	return result;
}
