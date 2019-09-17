import { fetch } from './fetch';

export function evaluate (items, state, content, element) {
	const strings = items.filter(item => typeof item === 'string').reverse();
	let hydrate = !state['.dispatch'];
	let candidate = '';
	let existing;

	if (element) {
		existing = element.getAttribute(content) || '';
	} else if (typeof content === 'object') {
		existing = content.nodeValue || '';
	} else {
		hydrate = false;
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

	if (typeof content !== 'string') {
		value = typeof value === 'string' ? value : '';

		if (!content) {
			return value;
		} else if (value !== existing) {
			content.nodeValue = value;
		}
	} else if (!element) {
		if (value === true) {
			return ` ${content}`;
		}

		return value !== false ? ` ${content}="${value}"` : '';
	} else if (typeof value === 'boolean') {
		const exists = element.hasAttribute(content);

		if (value && !exists) {
			element.toggleAttribute(content, true);
		} else if (!value && exists) {
			element.removeAttribute(content);
		}
	} else if (value !== element.getAttribute(content)) {
		element.setAttribute(content, value);
	}
}
