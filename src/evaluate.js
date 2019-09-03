import { fetch } from './fetch';

export function evaluate ([item, ...items], state, value) {
	const dynamic = Array.isArray(item);

	if (value && !dynamic) {
		value = value.slice(value.indexOf(item) + item.length);
	}

	items = items.length ? evaluate(items, state, value) : [];

	if (items[0] === false) {
		return items;
	} else if (dynamic) {
		const compare = item.some(item => typeof item === 'boolean');
		const partial = typeof items[0] === 'string';

		if (!compare) {
			if (value && partial) {
				value = value.slice(0, value.indexOf(items[0]));
			}

			item = fetch(item, state, value);
		} else if (partial) {
			const previous = items.shift();
			item = previous && fetch(item, state, value) && previous || '';
		} else {
			item = fetch(item, state, value);
		}
	}
	
	if (items[0] === true) {
		items.shift();
	}

	return [item, ...items];
}
