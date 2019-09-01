import { fetch } from './fetch';
import { render } from './render';

export function dynamo (state, [value, ...items], element, update) {
	const values = items.length ? dynamo(state, items, element, update) : [];

	if (Array.isArray(value)) {
		fetch(value) && values.shift();
		value = value && fetch(value, state, element, update);
	} else if (typeof value === 'object') {
		value = render(value, state, element, update);
	}

	return value ? [value, ...values] : values;
}
