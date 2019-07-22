export function evaluate (expression, state, scope = '', value, object) {
	const { length } = expression;
	let result = '';
	let index = 0;

	while (index < length) {
		let item = expression[index++];

		if (Array.isArray(item)) {
			const [definition, condition] = item;
			const absolute = definition.startsWith('.');
			const measure = definition.endsWith('#');
			const compare = condition !== undefined;
			let key = definition.replace(/^\.|#$/g, '');
			let candidate = expression[index];

			if (Array.isArray(candidate)) {
				candidate = '';
			} else if (compare) {
				index++;
			}

			if (object) {
				let index = candidate ? value.indexOf(candidate) : -1;

				if (compare) {
					item = !index ? candidate : '';
				} else {
					item = index > -1 ? value.slice(0, index) : value;
				}

				if (!measure) {
					if (!absolute) {
						key = `${scope.slice(0, !key ? -1 : undefined)}${key}`;
					}

					let value = item;

					if (compare) {
						value = item === candidate ? condition : '';
					} else if (item && !isNaN(item)) {
						value = Number(item);
					} else if (item === 'true') {
						value = true;
					} else if (item === 'false') {
						value = false;
					}

					if (value !== '') {
						object[key] = value;
					}
				}
			} else {
				if (definition === '#') {
					const keys = scope.split('.').reverse();
					const index = keys.find(key => !isNaN(key) && key);
		
					item = index !== undefined ? Number(index) : undefined;
				} else {
					item = (key ? key.split('.') : []).reduce((item, key) => {
						if (item !== undefined && item !== null) {
							return item[key];
						}
					}, !absolute && state[''] || state);

					if (measure) {
						item = item.length - 1;
					}
				}

				if (compare) {
					item = item === condition;

					if (candidate !== undefined) {
						item = item ? candidate : '';
					}
				}
			}
		}

		if (object) {
			value = value.slice(item.length);
		}
		
		if (length === 1) {
			result = item;
		} else if (/^(boolean|number|string)$/.test(typeof item)) {
			result += item;
		}
	}

	return result;
}
