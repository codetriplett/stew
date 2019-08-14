import { fetch } from './fetch';

export function evaluate (expression, state, name = '') {
	let value = expression;

	if (Array.isArray(expression)) {
		const { length } = expression;
		let values = [];
		let index = 0;

		while (index < length) {
			const query = expression[index++];
			
			value = fetch(query, state);
			values.push(value);
		}

		value = values.filter(value => {
			return /^(number|string)$/.test(typeof value);
		}).join('');
	}

	if (!name) {
		return value;
	} else if (value === true) {
		return ` ${name}`;
	} else if (name === 'class') {
		value = value.trim().replace(/\s+/, ' ');
	}
	
	return ` ${name}="${value}"`;
}
