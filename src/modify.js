export function modify (value, element, name) {
	if (typeof value === 'function') {
		if (element) {
			element.addEventListener(name.slice(2), value);
		}
	} else if (typeof element === 'string') {
		if (value === true) {
			return ` ${element}`;
		}

		return value !== false ? ` ${element}="${value}"` : '';
	} else if (!name) {
		const text = typeof value === 'string' ? value : '';

		if (!element) {
			return text;
		} else if (text !== element.nodeValue) {
			element.nodeValue = text;
		}
	} else if (typeof value === 'boolean') {
		const exists = element.hasAttribute(name);
	
		if (value && !exists) {
			element.toggleAttribute(name, true);
		} else if (!value && exists) {
			element.removeAttribute(name);
		}
	} else if (value !== element.getAttribute(name)) {
		element.setAttribute(name, value);
	}
}
