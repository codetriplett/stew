import { fetch } from './fetch';

export function evaluate (expression, state, name = '', element, update) {
	const { length } = expression;
	const activate = name.startsWith('on');
	let values = [];
	let index = 0;
	let existing;
	
	if (activate) {
		existing = (object, key, event) => {
			if (name === 'onclick') {
				object[key] = !object[key];
			}

			update();
		};
	} else if (element) {
		existing = name ? element.getAttribute(name) : element.nodeValue;
	}

	while (index < length) {
		const query = expression[index++];
		const compare = query.length > 1;
		let candidate = expression[index];

		if (Array.isArray(candidate)) {
			candidate = '';
		} else if (compare) {
			index++;
		}

		const value = fetch(query, state, candidate, existing);
		const convert = typeof value === 'boolean' && !compare;

		if (update && !activate) {
			existing = value;
			continue;
		}

		values.push(convert ? String(value) : value);
	}

	if (update) {
		if (activate) {
			values = values.filter(value => typeof value === 'function');
	
			element.addEventListener(name.slice(2), event => {
				values.forEach(action => action(event));
			});
		}

		return '';
	}

	const strings = values.filter(value => {
		return /^(number|string)$/.test(typeof value);
	});

	const value = strings.join('');
	
	if (!element) {
		if (!name) {
			return value;
		} else if (strings.length) {
			return ` ${name}="${value}"`
		} else if (values.some(value => value === true)) {
			return ` ${name}`;
		}
	} else if (value !== value) {
		if (!name) {
			element.nodeValue = value;
		} else if (values.length) {
			element.setAttribute(name, value);
		} else {
			element.removeAttribute(name);
		}
	}

	return '';
}
