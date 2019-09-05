import { fetch } from './fetch';

export function evaluate ([item, ...items], state, value) {
	const dynamic = Array.isArray(item);

	if (value && !dynamic) {
		const index = value.indexOf(item);

		if (index !== -1) {
			value = value.slice(index + item.length);
		}
	}

	if (items.length) {
		items = evaluate(items, state, value);
	} else if (value === '') {
		value = true;
	}

	if (items[0] === false) {
		return items;
	} else if (dynamic) {
		const compare = item.length > 1;
		const partial = typeof items[0] === 'string';

		if (!compare) {
			if (value && partial) {
				value = value.slice(0, value.indexOf(items[0]));
			}

			item = fetch(item, state, value);
		} else if (partial) {
			const previous = items.shift();
			const valid = !value || previous && value.startsWith(previous);

			item = valid && fetch(item, state, value) && previous || '';
		} else {
			item = fetch(item, state, value);
		}
	}
	
	if (items[0] === true) {
		items.shift();
	}

	return [item, ...items];
}
