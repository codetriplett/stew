export function fetch (item, state, value) {
	const hydrate = Array.isArray(value);

	if (!Array.isArray(item)) {
		if (!hydrate) {
			return item;
		} else if (item === value[0]) {
			return value.shift();
		}

		return '';
	}

	let [key, comparison] = item;
	const compare = item.length > 1;
	const iteration = Array.isArray(state);
	const keys = iteration ? [key] : key.split(/\.(?!\.*$)/);
	const measure = !iteration && key.endsWith('.');

	if (typeof comparison === 'string' && comparison.endsWith('.')) {
		comparison = fetch([comparison], state, []);
	}
	
	key = keys.pop();
	state = keys.reduce((state, key) => fetch([key], state), state);

	const { '.': { '': indices, backup } } = state;

	if (/^\.+$/.test(key)) {
		return indices[key.length] || 0;
	} else if (measure) {
		key = key.slice(0, -1);
	} else if (hydrate) {
		value = compare ? comparison : value.shift();

		if (value !== undefined && value !== '') {
			if (!compare && !isNaN(value)) {
				value = Number(value);
			}

			state[key] = value;
		}
	}

	if (state.hasOwnProperty(key) || measure) {
		value = state[key];
	}

	const iterative = Array.isArray(value);

	if (measure && iterative) {
		value = value.length - 1;
	} else if (!hydrate && /^(undefined|object)$/.test(typeof value)) {
		if (value && value[''] === state) {
			return value;
		}
		
		const { '.': { ...settings } } = state;

		if (backup) {
			settings.backup = backup[key] = iterative ? [] : {};
		}
		
		if (iteration && !iterative) {
			settings[''] = [key, ...indices];
			state = state[''];
		}

		value = state[key] = iterative ? [...value] : { ...value };
		Object.assign(value, { '': state, '.': settings });

		if (iterative) {
			for (let i = 0; i < value.length; i++) {
				value[i] = fetch([i], value);
			}
		}
	} else if (measure && backup) {
		backup[key] = value;
	}

	if (compare) {
		return value !== undefined && value === comparison;
	}

	return typeof value !== 'boolean' ? value : '';
}
