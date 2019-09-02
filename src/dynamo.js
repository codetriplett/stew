import { fetch } from './fetch';
import { render } from './render';
import { modify } from './modify';

export function dynamo ([value, ...values], ...parameters) {
	if (typeof parameters[0] === 'string') {
		const name = parameters.shift();
		values = dynamo([value, ...values], ...parameters);
		return modify(values, name, ...parameters.slice(1));
	}

	values = values.length ? dynamo(values, ...parameters) : [];

	if (values[0] === false) {
		return values;
	} else if (Array.isArray(value)) {
		const compare = fetch(value);
		const previous = compare && values.length ? values.shift() : true;

		value = previous && fetch(value, ...parameters);

		if (compare && previous !== true) {
			value = value ? previous : '';
		}
	} else if (typeof value === 'object') {
		value = render(value, ...parameters);
	}
	
	if (values[0] === true) {
		values.shift();
	}

	return [value, ...values];
}
