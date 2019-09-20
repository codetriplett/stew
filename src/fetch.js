export function fetch (item, state, value) {
	let [key, comparison] = item;
	const compare = item.length > 1;
	const measure = key.endsWith('.');
	const generate = value === undefined;
	const hydrate = typeof value === 'string';
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
		
		if (generate) {
			value = state[key];

			if (measure) {
				const { backup } = state['.'];

				if (Array.isArray(value)) {
					value = value.length - 1;
				} else if (backup && !backup.hasOwnProperty(key)) {
					fetch([key], backup, value);
				}
			}
		} else if (!hydrate && !compare) {
			const { update } = state['.'];

			return () => {
				const { [key]: previous } = state;
				state[key] = !previous;
				update();
			};
		}
	} else {
		value = state['.'].indices[keys.length];
	}

	if (compare) {
		if (typeof comparison === 'string' && comparison.endsWith('.')) {
			comparison = fetch([comparison], state);
		}
		
		if (hydrate) {
			value = state[key] = comparison;
		} else if (!generate) {
			const { update } = state['.'];
			
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
