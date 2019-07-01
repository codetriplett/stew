export function render (template, state, element, option) {
	const generate = option === undefined || typeof option === 'number';
	const extract = typeof option === 'string';

	if (typeof template !== 'object') {
		return template;
	} else if (Array.isArray(template)) {
		const [key = '', prefix = '', suffix = ''] = template;
		let { [key]: value = '' } = state;

		if (extract && typeof element === 'string') {
			const finish = -suffix.length || undefined;
			state[`${option}${key}`] = element.slice(prefix.length, finish);
		} else if (template.length > 1) {
			value = `${prefix}${value}${suffix}`;
		}

		return value;
	}

	const { '': structure, ...attributes } = template;
	const [tag, scope, children] = structure;
	let markup = `<${tag}`;

	if (scope) {
		state = state[scope];

		if (state === undefined) {
			return '';
		} else if (extract) {
			option += `${scope}.`;
		} else if (typeof state !== 'object') {
			state = { '': state };
		}
	}

	for (const name in attributes) {
		const listener = name.startsWith('on');
		const object = listener && typeof option === 'object' ? option : state;
		const reference = generate ? undefined : element.getAttribute(name);
		let value = render(attributes[name], object, reference, option);

		if (generate) {
			markup += listener ? '' : ` ${name}="${value}"`;
			continue;
		} else if (extract) {
			return '';
		}
		
		const present = element.hasAttribute(name);

		if (listener) {
			if (!present) {
				element.addEventListener(name.replace(/^on/, ''), value);
			}

			value = 'javascript:void(0);';
		}
		
		if (value === true && !present) {
			element.toggleAttribute(name, true);
		} else if (value === false && present) {
			element.removeAttribute(name);
		} else if (value !== reference) {
			element.setAttribute(name, value);
		}
	}

	markup += `${scope && generate ? ` data-stew="${element}"` : ''}>`;

	if (!children) {
		return markup;
	}

	const nodes = generate ? [] : element.childNodes;
	
	children.reduce((index, child, i) => {
		const node = generate ? i : nodes[index];

		if (node === undefined) {
			return index;
		}

		const [tag, scope] = child[''] || [];
		const { nodeValue = null } = node;
		const list = [];
		let indexed = false;
		
		if (nodeValue !== null) {
			list.push(nodeValue);
		} else if (!scope) {
			list.push(node);
		} else {
			const regex = new RegExp(`^${i}(-|$)`);

			while (node) {
				const stew = !node.nodeValue && node.getAttribute('data-stew');

				if (regex.test(stew || '')) {
					indexed = indexed || stew.indexOf('-') !== -1;
					list.push(node);
				}

				node = node.nextSibling;
			}
		}

		list.forEach((item, i) => {
			if (generate) {
				option = indexed ? i : undefined;
			}

			const value = render(child, state, item, option);

			if (nodeValue !== null && value !== nodeValue) {
				node.nodeValue = value;
			}

			markup += value;
		});

		return index + list.length;
	}, 0);

	return `${markup}</${tag}>`;
}
