export function fetch (item, state, value, update) {
	let [key, comparison] = item;
	const compare = item.length > 1;
	const measure = key.endsWith('.');
	const hydrate = value !== undefined;
	const keys = key.replace(/\.$/, '').split('.');

	key = keys.pop();

	if (key) {
		state = keys.reduce((state, key) => {
			if (!state.hasOwnProperty(key)) {
				const object = { '': state };
				let { '.': { backup, ...settings } } = state;

				if (backup) {
					backup = backup[key] = { '': backup };
				}

				object['.'] = { ...settings, backup };
				state[key] = object;
			}
			
			return state[key];
		}, state);
		
		if (!hydrate) {
			value = state[key];

			if (measure) {
				const { backup } = state['.'];

				if (Array.isArray(value)) {
					value = value.length - 1;
				} else if (backup && !backup.hasOwnProperty(key)) {
					fetch([key], backup, value);
				}
			}
		} else if (update && !compare) {
			return () => {
				const { [key]: previous } = state;

				switch (value) {
					case 'onclick': {
						state[key] = !previous;
					}
				}

				update();
			};
		}
	} else {
		value = state['.'].indices[keys.length];
	}

	if (compare) {
		if (typeof comparison === 'string' && comparison.endsWith('.')) {
			comparison = fetch([comparison], state);
		} else if (hydrate && !update) {
			value = state[key] = comparison;
		}

		if (update) {
			return () => {
				const { [key]: previous } = state;

				if (measure) {
					state[key] = previous ? previous - 1 : comparison;
				} else {
					state[key] = previous < comparison ? previous + 1 : 0;
				}

				update();
			};
		}

		value = value === comparison;
	} else if (value && !measure && !state.hasOwnProperty(key)) {
		value = state[key] = !isNaN(value) ? Number(value) : value;
	} else if (typeof value === 'boolean') {
		value = '';
	}

	return value;
}
