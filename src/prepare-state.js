export function prepareState (object) {
	if (typeof object !== 'object') {
		return object;
	} else if (Array.isArray(object)) {
		return object.map(value => prepareState(value));
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
				if (typeof update === 'function') {
					updaters = updaters.filter(updater => updater !== update);
					
					if (valueRead) {
						updaters.push(update);
						valueRead = false;
					}

					return;
				}
				
				const value = object[key];
				
				if (update === value) {
					return;
				} else if (typeof value === 'object') {
					for (const key in value) {
						value[key] = update[key];
					}
				}

				object[key] = update;
				updaters.forEach(updater => updater());
			}
		});
		
		if (typeof object[key] === 'object') {
			result[key] = prepareState(object[key]);
		}
	}

	return result;
}
