export function modify (values, name, element) {
	if (typeof values === 'function') {
		if (element) {
			element.addEventListener(name.slice(2), values);
		}

		return '';
	}

	const toggle = typeof values[0] === 'boolean';
	const value = toggle ? values[0] : values.join('');

	if (!name) {
		const text = toggle ? '' : value;

		if (element && element.nodeValue !== text) {
			element.nodeValue = text;
		}

		return text;
	} else if (!element) {
		if (!toggle) {
			return ` ${name}="${value}"`;
		}

		return value ? ` ${name}` : '';
	} else if (toggle) {
		const exists = element.hasAttribute(name);

		if (value === true && !exists) {
			element.toggleAttribute(name, true);
		} else if (value === false && exists) {
			element.removeAttribute(name);
		}
	} else {
		const existing = element.getAttribute(name);

		if (value !== existing) {
			element.setAttribute(name, value);
		}
	}

	return '';
}
