export function render (template, state = {}, element, root = state) {
	let id;

	if (element !== undefined && typeof element !== 'object') {
		id = element;
		element = undefined;
	}

	if (typeof template !== 'object') {
		return template;
	} else if (Array.isArray(template)) {
		const [key, prefix = '', suffix = ''] = template;
		const value = `${prefix}${state[key] || ''}${suffix}`;

		if (element) {
			element.nodeValue = value;
		}

		return value;
	}

	const { '': structure, ...attributes } = template;
	const [tag, scope = '', children] = structure;

	if (scope) {
		state = state[scope];

		if (state === undefined) {
			return '';
		} else if (Array.isArray(state)) {
			return state.map((item, i) => {
				const state = { [scope]: item };
				return render(template, state, `${id}-${i}`);
			}).join('');
		}
	}

	const nodes = element ? element.childNodes : [];
	let markup = `<${tag}`;

	for (const name in attributes) {
		const listener = name.startsWith('on');
		let value = attributes[name];

		if (Array.isArray(value)) {
			const [key, prefix = '', suffix = ''] = value;

			value = (listener ? root : state)[key] || '';

			if (value.length > 1) {
				value = `${prefix}${value}${suffix}`;
			}
		}
		
		if (listener && typeof value === 'function') {
			if (!element.hasAttribute(name)) {
				element.addEventListener(name.replace(/^on/, ''), value);
			}

			value = 'javascript:void(0);';
		}

		if (!element || value === element.getAttribute(name)) {
			markup += ` ${name}="${value}"`;
		} else if (value === true) {
			element.toggleAttribute(name, true);
		} else if (value === false) {
			element.removeAttribute(name);
		} else {
			element.setAttribute(name, value);
		}
	}

	markup += `${scope && id !== undefined ? ` data-stew="${id}"` : ''}>`;

	if (!children) {
		return markup;
	}

	children.forEach((item, i) => {
		markup += render(item, state, element ? nodes[i] : i);
	});

	return `${markup}</${tag}>`;
}
