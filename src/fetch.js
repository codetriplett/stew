export const TOGGLE = -1;

export function fetch (item, state, value) {
	const activate = value < 0;
	let create = typeof value === 'number';
	let hydrate = typeof value === 'string';

	if (!Array.isArray(item)) {
		return !hydrate || item === value ? item : '';
	}

	let [key, comparison] = item;
	const compare = item.length > 1;
	const iteration = Array.isArray(state);
	const keys = iteration ? [key] : key.split(/\.(?!\.*$)/);
	const measure = !iteration && key.endsWith('.');

	if (create && compare) {
		create = false;
		hydrate = true;
	}

	if (typeof comparison === 'string' && comparison.endsWith('.')) {
		comparison = fetch([comparison], state, value);
	}

	key = keys.pop();

	state = keys.reduce((state, key) => {
		return key ? fetch([key], state) : state[key];
	}, state);

	let { '.': [option, label, ...indices] } = state;
	const generate = typeof option === 'object';

	if (key === '') {
		state = state[''];
		key = label || '';
	}

	if (measure) {
		const { length } = key.match(/\.+$/)[0];
		key = key.slice(0, -length);

		if (!key && !activate) {
			value = indices[length - 1];
		}
	} else if (hydrate) {
		if (compare) {
			value = comparison !== false ? comparison : undefined;
		}

		if (value !== undefined && value !== '') {
			if (!compare && !isNaN(value)) {
				value = Number(value);
			}

			state[key] = value;
		}
	}

	const exists = state.hasOwnProperty(key);

	if (activate) {
		switch (value) {
			case TOGGLE:
				return () => {
					const { [key]: previous } = state;
					state[key] = !previous;
					option();
				}
			default:
				return () => {}
		}
	} else if (!exists && create) {
		value = value > 0 ? Array(value).fill(0).map(() => ({})) : {};
	} else if (!measure && exists || measure && key) {
		value = state[key];
	}

	const iterative = Array.isArray(value);

	if (measure && iterative) {
		value = value.length - 1;
	} else if (typeof value === 'object' && !value.hasOwnProperty('')) {
		if (value && value[''] === state) {
			return value;
		} else if (generate) {
			option = option[key] = iterative ? [] : {};
		}

		value = state[key] = iterative ? [...value] : { ...value };

		if (iteration) {
			indices.unshift(key);
			state = state[''];
		} else {
			label = key;
		}

		Object.assign(value, { '': state, '.': [option, label, ...indices] });

		if (iterative) {
			for (let i = 0; i < value.length; i++) {
				value[i] = fetch([i], value, create ? 0 : undefined);
			}
		}
	} else if (measure && key && generate) {
		option[key] = value;
	}

	if (compare) {
		if (value === undefined || value === null) {
			value = false;
		}
		
		return value === comparison;
	}

	return typeof value !== 'boolean' ? value : '';
}
