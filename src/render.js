export function render (template, state = {}, element) {
	if (typeof template !== 'object') {
		return template;
	} else if (Array.isArray(template)) {
		const [prefix, key, suffix] = template;
		const value = `${prefix}${state[key] || ''}${suffix}`;

		if (element) {
			element.nodeValue = value;
		}

		return value;
	}

	const { '': structure, ...attributes } = template;

	if (Array.isArray(structure[1])) {
		structure.splice(1, 0, undefined);
	}

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

	for (const name in attributes) {
		let value = attributes[name];

		if (Array.isArray(value)) {
			if (value.length === 1) {
				value = state[value[0]];
			} else {
				value = attributes[name].map((value, i) => {
					return i % 2 ? state[value] || '' : value;
				}).join('');
			}
		}

		if (name.startsWith('on') && typeof value === 'function') {
			if (!element.hasAttribute(name)) {
				element.addEventListener(name.replace(/^on/, ''), value);
			}

			value = 'javascript:void(0);';
		}

		if (!element || value === element.getAttribute(name)) {
			markup += ` ${name}="${value}"`;
			continue;
		}

		if (value === true) {
			element.toggleAttribute(name, true);
		} else if (value === false || value === undefined) {
			element.removeAttribute(name);
		} else {
			element.setAttribute(name, value);
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
		markup += render(item, state, childNodes[i]);
	});

	return element || `${markup}</${tagName}>`;
}
