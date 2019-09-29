import { fetch, TOGGLE } from './fetch';

export function evaluate (items, state, existing) {
	const strings = items.filter(item => typeof item === 'string').reverse();
	const hydrate = existing !== undefined && !state['.'][0][''];
	let candidate = '';
	let option;

	return items.reduceRight((value, item) => {
		const dynamic = typeof item !== 'string';

		if (!value) {
			return value;
		} else if (!dynamic || hydrate && item.length === 1) {
			candidate = existing;

			if (!hydrate) {
				candidate = strings.shift();
			} else if (strings.length) {
				let [string] = strings;

				if (dynamic) {
					while (string !== undefined) {
						const index = existing.lastIndexOf(string);
				
						if (index !== -1) {
							candidate = existing.slice(index + string.length);
							break;
						}
				
						string = strings.shift();
					}
				} else if (existing.endsWith(string)) {
					candidate = strings.shift();
				} else {
					candidate = '';
				}

				if (candidate) {
					existing = existing.slice(0, -candidate.length);
				}
			}

			if (!dynamic || !candidate) {
				value.unshift(candidate);
				return value;
			}
		}

		const { length } = value;
		const skip = length > 0 && item.length > 1 && candidate === '';

		item = skip || fetch(item, state, hydrate ? candidate : option);

		if (item === false) {
			if (!length) {
				return false;
			}
			
			value[0] = '';
		} else if (item !== true) {
			if (item && hydrate) {
				existing = existing.slice(0, -item.length);
			}

			value.unshift(item);
			candidate = item;
		}

		return value;
	}, []);
}
