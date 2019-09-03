import { fetch } from './fetch';

export function evaluate ([value, ...values], state) {
	values = values.length ? evaluate(values, state) : [];

	if (values[0] === false) {
		return values;
	} else if (Array.isArray(value)) {
		const compare = value.some(item => typeof item === 'boolean');
		const previous = compare && values.length ? values.shift() : true;

		value = previous && fetch(value, state);

		if (previous !== true) {
			value = value ? previous : '';
		}
	}
	
	if (values[0] === true) {
		values.shift();
	}

	return [value, ...values];
}
