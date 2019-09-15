import { fetch } from './fetch';

export function dynamo (items, state, element, name) {
	const strings = items.filter(item => typeof item === 'string').reverse();
	const generate = !element || element.constructor === Object;
	const hydrate = !generate && !state['.dispatch'];
	let candidate = '';
	let existing;

	if (!generate) {
		if (name) {
			existing = element.getAttribute(name) || '';
		} else {
			existing = element.nodeValue || '';
		}
	}

	let value = items.reduceRight((value, item) => {
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

		item = skip || fetch(item, state, hydrate && candidate);

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

	if (hydrate) {
		return;
	} else if (value) {
		value = value.length ? value.join('') : true;
	}

	if (!name) {
		value = typeof value === 'string' ? value : '';

		if (generate) {
			return value;
		} else if (value !== existing) {
			element.nodeValue = value;
		}
	} else if (generate) {
		if (value === true) {
			return ` ${name}`;
		}

		return value !== false ? ` ${name}="${value}"` : '';
	} else if (typeof value === 'boolean') {
		const exists = element.hasAttribute(name);

		if (value && !exists) {
			element.toggleAttribute(name, true);
		} else if (!value && exists) {
			element.removeAttribute(name);
		}
	} else if (value !== element.getAttribute(name)) {
		element.setAttribute(name, value);
	}
}
