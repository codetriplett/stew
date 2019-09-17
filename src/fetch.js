export function fetch (item, state, value) {
	let [key, comparison] = item;
	const compare = item.length > 1;
	const measure = key.endsWith('.');
	const hydrate = value !== undefined;
	const keys = key.replace(/\.+$/, '').split('.');

	key = keys.pop();

	state = keys.reduce((state, key) => {
		if (!state.hasOwnProperty(key)) {
			const { '.': settings } = state;
			const object = { '': state };

			if (settings) {
				let { backup } = settings;
				
				backup = backup[key] = { '': backup };
				object['.'] = { ...settings, backup };
			}

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
	}

	if (compare) {
		if (typeof comparison === 'string' && comparison.endsWith('.')) {
			comparison = hydrate ? value : fetch([comparison], state);
		} else if (hydrate) {
			value = state[key] = comparison;
		}

		value = value === comparison;
	} else if (hydrate && value && !state.hasOwnProperty(key)) {
		value = state[key] = !isNaN(value) ? Number(value) : value;
	} else if (typeof value === 'boolean') {
		value = '';
	}

	return value;
}
