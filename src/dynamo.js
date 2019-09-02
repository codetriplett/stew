import { fetch } from './fetch';
import { modify } from './modify';

export function dynamo (template, ...parameters) {
	if (!Array.isArray(template)) {
		const { '': [...children], ...attributes } = template;
		const names = Object.keys(attributes).sort();
		const tag = children.shift();

		const markup = `<${tag}${names.map(name => {
			return dynamo(attributes[name], name, ...parameters);
		}).join('')}>`;

		if (!children.length) {
			return markup;
		}

		return `${markup}${dynamo(children, '', ...parameters)}</${tag}>`;
	} else if (!parameters.length) {
		return template.length > 1;
	} else if (typeof parameters[0] === 'string') {
		const name = parameters.shift();
		values = dynamo(template, ...parameters);
		return modify(values, name, ...parameters.slice(1));
	}

	let [value, ...values] = template;
	values = values.length ? dynamo(values, ...parameters) : [];

	if (values[0] === false) {
		return values;
	} else if (Array.isArray(value)) {
		const compare = dynamo(value);
		const previous = compare && values.length ? values.shift() : true;

		value = previous && fetch(value, ...parameters);

		if (compare && previous !== true) {
			value = value ? previous : '';
		}
	} else if (typeof value === 'object') {
		value = dynamo(value, ...parameters);
	}
	
	if (values[0] === true) {
		values.shift();
	}

	return [value, ...values];
}
