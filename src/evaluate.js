export function evaluate (expression, state, scope = '', string = '', object) {
	const { length } = expression;
	let result = '';
	let index = 0;

	while (index < length) {
		let item = expression[index++];
		let prefix = item;

		if (Array.isArray(item)) {
			const compare = item.length > 1;
			let candidate = expression[index];
			let [definition] = item;
			let array = state;

			if (Array.isArray(candidate)) {
				candidate = '';
			} else if (compare) {
				index++;
			}

			const [value, condition] = item.map((item, i) => {
				if (typeof item !== 'string') {
					return item;
				} else if (item === '#') {
					const keys = scope.split('.').reverse();
					const index = keys.findIndex(item => !isNaN(item) && item);
					const value = keys[index];

					keys.slice(index + 1).reverse().forEach(key => {
						if (array !== undefined && array !== null) {
							array = array[key];
						}
					});
		
					return value !== undefined ? Number(value) : undefined;
				}

				const absolute = item.startsWith('.');
				const measure = item.endsWith('#');
				const verify = item.endsWith('?');
				const key = item.replace(/^\.|[#?]$/g, '');

				if (object && !i && !absolute) {
					definition = `${scope}${definition}`;
				}

				item = (key ? key.split('.') : []).reduce((item, key) => {
					if (item !== undefined && item !== null) {
						if (!item.hasOwnProperty(key) && object) {
							return object[key];
						}

						return item[key];
					}
				}, !absolute && scope ? state[''] : state);

				if (measure) {
					return Array.isArray(item) ? item.length - 1 : undefined;
				}

				return verify ? item !== undefined : item;
			});
			
			item = value;

			if (object) {
				let index = candidate ? string.indexOf(candidate) : -1;

				if (compare) {
					prefix = !index && candidate || '';
				} else {
					prefix = index > -1 ? string.slice(0, index) : string;
				}
				
				if (!definition.endsWith('#') && item === undefined) {
					let value = prefix;

					if (compare) {
						const fallback = condition === true ? false : '';
						value = value === candidate ? condition : fallback;
					} else if (value && !isNaN(value)) {
						value = Number(value);
					} else if (value === 'true') {
						value = true;
					} else if (value === 'false') {
						value = false;
					}

					if (value !== '' && value !== undefined) {
						object[definition.replace(/^\.|\.$/g, '')] = value;
						item = value;
					}
				}
			}
			
			if (compare && item !== undefined) {
				if (definition === '#' && condition < 0 && array) {
					item -= array.length;
				}

				item = item === condition;

				if (candidate !== undefined) {
					item = item ? candidate : '';
				}
			}
		}

		if (object) {
			string = string.slice(prefix.length);
		}

		if (length === 1) {
			result = item;
		} else if (/^(boolean|number|string)$/.test(typeof item)) {
			result += item;
		}
	}

	return result;
}
