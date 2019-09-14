import { fetch } from './fetch';

export function evaluate (items, state, value) {
	const strings = items.filter(item => typeof item === 'string').reverse();
	const hydrate = typeof value === 'string' || undefined;
	let candidate = '';

	const values = items.reduceRight((values, item) => {
		const dynamic = typeof item !== 'string';

		if (!values) {
			return values;
		} else if (!dynamic || hydrate && item.length === 1) {
			candidate = value;

			if (!hydrate) {
				candidate = strings.shift();
			} else if (strings.length) {
				let [string] = strings;

				if (dynamic) {
					while (string !== undefined) {
						const index = value.lastIndexOf(string);
				
						if (index !== -1) {
							candidate = value.slice(index + string.length);
							break;
						}
				
						string = strings.shift();
					}
				} else {
					candidate = value.endsWith(string) ? strings.shift() : '';
				}

				if (candidate) {
					value = value.slice(0, -candidate.length);
				}
			}

			if (!dynamic || !candidate) {
				values.unshift(candidate);
				return values;
			}
		}

		const { length } = values;
		const skip = length > 0 && item.length > 1 && candidate === '';

		item = skip || fetch(item, state, hydrate && candidate);

		if (item === false) {
			if (!length) {
				return;
			}
			
			values[0] = '';
		} else if (item !== true) {
			if (item && hydrate) {
				value = value.slice(0, -item.length);
			}

			values.unshift(item);
			candidate = item;
		}

		return values;
	}, []);

	if (hydrate) {
		return;
	} else if (!values) {
		return false;
	}

	return values.length ? values.join('') : true;
}
