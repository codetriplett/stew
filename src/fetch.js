export function fetch (item, state, values) {
	const hydrate = Array.isArray(values);

	if (!Array.isArray(item)) {
		if (!hydrate) {
			return item;
		} else if (item === values[0]) {
			return values.shift();
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
		let value = compare ? comparison : values.shift();

		if (state.hasOwnProperty(key)) {
			value = state[key];
		} else if (value === undefined || value === '') {
			return '';
		} else if (!compare && !isNaN(value)) {
			value = Number(value);
		}

		state[key] = value;
	}

	let { [key]: scope = state[key] = {} } = state;
	const iterative = Array.isArray(scope);

	if (measure && iterative) {
		scope = scope.length - 1;
	} else if (scope[''] === state) {
		return scope;
	} else if (!hydrate && typeof scope === 'object') {
		const { '.': { ...settings } } = state;

		if (backup) {
			settings.backup = backup[key] = iterative ? [] : {};
		}
		
		if (iteration && !iterative) {
			settings[''] = [key, ...indices];
			state = state[''];
		}

		scope = state[key] = iterative ? [...scope] : { ...scope };
		Object.assign(scope, { '': state, '.': settings });

		if (iterative) {
			for (let i = 0; i < scope.length; i++) {
				scope[i] = fetch([i], scope);
			}
		}
	} else if (measure && backup) {
		backup[key] = scope;
	}

	if (compare) {
		return scope === comparison;
	}

	return typeof scope !== 'boolean' ? scope : '';
}
