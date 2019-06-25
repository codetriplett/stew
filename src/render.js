export function render (template, state = {}, element) {
	const { '': structure, ...attributes } = template;
	const [tagName, scopeKey, children] = structure;

	if (scopeKey) {
		let value = state[scopeKey];
		let object = {};

		if (value === undefined) {
			return '';
		} else if (Array.isArray(value)) {
			return value.map(item => {
				const itemState = { ...state, [scopeKey]: item };
				return render(template, itemState);
			}).join('');
		}

		if (typeof value === 'object') {
			object = value;
			value = undefined;
		}

		state = { ...state, ...object, '': value };
	}

	const childNodes = element ? element.childNodes : [];
	let markup = `<${tagName}`;

	for (const key in attributes) {
		const value = attributes[key].map((value, i) => {
			return i % 2 ? state[value] || '' : value;
		}).join('');

		if (!element || value === element.getAttribute(key)) {
			markup += ` ${key}="${value}"`;
			continue;
		}

		if (value === true) {
			element.toggleAttribute(key, true);
		} else if (value === false || value === undefined) {
			element.removeAttribute(key);
		} else {
			element.setAttribute(key, value);
		}
	}
	
	markup += '>';

	if (!children) {
		return markup;
	}

	const value = state[''];

	if (!children.length && value !== undefined) {
		if (!element) {
			markup += value;
		} else {
			element.innerText = value;
		}
	}

	children.forEach((item, i) => {
		markup += render(item, childNodes[i]);
	});

	return element || `${markup}</${tagName}>`;
}
