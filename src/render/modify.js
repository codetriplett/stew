export function modify ([name, value], element) {
	if (!name) {
		name = 'data--';
	}

	if (typeof value === 'string') {
		if (!element) {
			return ` ${name}="${value}"`;
		} else if (name && element.getAttribute(name) !== value) {
			element.setAttribute(name, value);
		}
	} else if (value === true) {
		if (!element) {
			return ` ${value}`;
		} else if (!element.hasAttribute(name)) {
			element.toggleAttribute(name, true);
		}
	} else if (!element) {
		return '';
	} else if (element.hasAttribute(name)) {
		if (value === false) {
			element.removeAttribute(name);
		}
	} else if (typeof value === 'function') {
		element.addEventListener(name.slice(2), value);
		element.setAttribute(name, 'javascript:void(0);');
	}
}
