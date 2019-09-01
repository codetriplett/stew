import { fetch } from './fetch';
import { render } from './render';

export function dynamo ([value, ...values], ...parameters) {
	values = values.length ? dynamo(values, ...parameters) : [];

	if (Array.isArray(value)) {
		const compare = fetch(value);
		const previous = compare && values.length ? values.shift() : true;
		const current = previous && fetch(value, ...parameters);

		value = compare ? previous : current;
	} else if (typeof value === 'object') {
		value = render(value, ...parameters);
	}

	if (typeof values[0] === 'boolean') {
		values.shift();
	}

	return [value, ...values];
}
