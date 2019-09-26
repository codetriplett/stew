export const TOGGLE = 0;

export function fetch (item, state, value) {
	const hydrate = typeof value === 'string';
	const activate = typeof value === 'number';

	if (!Array.isArray(item)) {
		return !hydrate || item === value ? item : '';
	}

	let [key, comparison] = item;
	const compare = item.length > 1;
	const iteration = Array.isArray(state);
	const keys = iteration ? [key] : key.split(/\.(?!\.*$)/);
	const measure = !iteration && key.endsWith('.');

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
			value = comparison;
		}

		if (value !== undefined && value !== '') {
			if (!compare && !isNaN(value)) {
				value = Number(value);
			}

			state[key] = value;
		}
	}

	if (activate) {
		const { [key]: previous } = state;

		return () => {
			state[key] = !previous;
			option();
		};
	} else if (!measure && state.hasOwnProperty(key) || measure && key) {
		value = state[key];
	}

	const iterative = Array.isArray(value);
	const relate = typeof value === 'object' && !value.hasOwnProperty('');
	const create = !hydrate && !generate && !option[''] && value === undefined;

	if (measure && iterative) {
		value = value.length - 1;
	} else if (relate || create) {
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
				value[i] = fetch([i], value);
			}
		}
	} else if (measure && generate) {
		option[key] = value;
	}

	if (compare) {
		return value !== undefined && value === comparison;
	}

	return typeof value !== 'boolean' ? value : '';
}
