import { fetch } from './fetch';

export function evaluate (expression, state, name = '', element, update) {
	const { length } = expression;
	const activate = name.startsWith('on');
	let values = [];
	let index = 0;
	let existing;
	let final;

	if (activate) {
		if (!update) {
			return '';
		}

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

		final = fetch(query, state, candidate, update ? existing : undefined);

		if (update && !activate) {
			existing = final;
			continue;
		} else if (typeof final === 'boolean' && !compare) {
			final = String(final);
		}

		values.push(final);
	}

	if (update) {
		if (activate) {
			values = values.filter(value => typeof value === 'function');
	
			element.addEventListener(name.slice(2), event => {
				values.forEach(action => action(event));
			});
		}

		return;
	}

	const strings = values.filter(value => {
		return /^(number|string)$/.test(typeof value);
	});

	const value = final === false ? null : strings.join('');

	if (!element) {
		if (!name) {
			return value;
		} else if (final === true) {
			return ` ${name}`;
		} else if (final === false) {
			return '';
		}
		
		return ` ${name}="${value}"`;
	} else if (value !== existing) {
		if (!name) {
			element.nodeValue = value;
		} else if (final === true) {
			element.toggleAttribute(name, true);
		} else if (final === false) {
			element.removeAttribute(name);
		} else {
			element.setAttribute(name, value);
		}
	}
}
