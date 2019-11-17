export const CLICK = -1;

export function fetch (item, state, value) {
	const activate = value < 0;
	let create = typeof value === 'number';
	let hydrate = typeof value === 'string';

	if (!Array.isArray(item)) {
		return !hydrate || item === value ? item : '';
	}

	let [key, comparison] = item;
	const compare = item.length > 1;
	const inverted = typeof comparison === 'string' && comparison[0] === '-';
	const iteration = Array.isArray(state);
	const keys = iteration ? [key] : key.split(/\.(?!\.*$)/);
	const measure = !iteration && key.endsWith('.');

	if (inverted) {
		comparison = comparison.slice(1);
	}

	if (create && compare) {
		create = false;
		hydrate = true;
	}

	if (activate) {
		comparison === undefined;
	} else if (typeof comparison === 'string' && comparison.endsWith('.')) {
		comparison = fetch([comparison], state, value);
	}

	key = keys.pop();

	let scope = keys.reduce((scope, key) => {
		return key ? fetch([key], scope) : scope[key];
	}, state);

	let { '.': [option, label, ...indices], '..': deferred } = scope;
	const generate = typeof option === 'object';

	if (key === '') {
		scope = scope[''];
		key = label || '';
	}

	if (measure) {
		const { length } = key.match(/\.+$/)[0];
		key = key.slice(0, -length);

		if (!key && !activate) {
			value = indices[length - 1];
		}
	} else if (hydrate && !activate) {
		if (compare) {
			value = comparison !== false ? comparison : undefined;
		}

		if (value !== undefined && value !== '') {
			if (!compare && !isNaN(value)) {
				value = Number(value);
			}

			scope[key] = value;
		}
	}

	const exists = scope.hasOwnProperty(key);

	if (activate) {
		switch (value) {
			case CLICK:
				return event => {
					const { [key]: previous = 0 } = scope;
					event.preventDefault();

					if (!compare) {
						scope[key] = !previous;
					} else {
						comparison = fetch([item[1].replace(/^-/, '')], state);

						if (typeof comparison !== 'number') {
							const matched = previous === comparison;
							scope[key] = matched ? false : comparison;
						} else if (!inverted) {
							const next = previous + 1;
							scope[key] = next <= comparison ? next : 0;
						} else {
							const next = previous - 1;
							scope[key] = next >= 0 ? next : comparison;
						}
					}

					return false;
				}
			default:
				return () => {}
		}
	} else if (!exists && create) {
		value = value > 0 ? Array(value).fill(0).map(() => ({})) : {};
	} else if (!measure && exists || measure && key) {
		value = scope[key];
	}

	const iterative = Array.isArray(value);

	if (measure && iterative) {
		value = value.length - 1;
	} else if (typeof value === 'object' && !value.hasOwnProperty('')) {
		if (value && value[''] === scope) {
			return value;
		} else if (generate) {
			let backup = value;

			if (!measure || !key) {
				backup = iterative ? [] : {};
			}

			option = option[key] = backup;
		}

		value = scope[key] = iterative ? [...value] : { ...value };

		if (iteration) {
			indices.unshift(key);
			scope = scope[''];
		} else {
			label = key;
		}

		Object.assign(value, {
			'': scope,
			'.': [option, label, ...indices],
			'..': deferred
		});

		if (iterative) {
			for (let i = 0; i < value.length; i++) {
				value[i] = fetch([i], value, create ? 0 : undefined);
			}
		}
	} else if (measure && key && generate) {
		option[key] = value;
	}

	if (compare) {
		if (value === undefined && comparison === 0) {
			return true;
		} else if (value === undefined || value === null) {
			value = false;
		}

		return value === comparison;
	}

	return value;
}
