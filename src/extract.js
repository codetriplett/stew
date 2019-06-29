export function extract (template, reference, object, chain = '', index) {
	if (typeof template !== 'object') {
		return object;
	} else if (Array.isArray(template) && typeof reference === 'string') {
		const [key, prefix = '', suffix = ''] = template;
		const suffixIndex = -suffix.length || undefined;

		object[`${chain}${key}`] = reference.slice(prefix.length, suffixIndex);

		return object;
	} else if (Array.isArray(template) || typeof reference === 'string') {
		return object;
	}

	const { '': structure, ...attributes } = template;
	const [scope, children = []] = structure.slice(1);
	const nodes = reference.childNodes;
	const stew = reference.getAttribute('data-stew');
	const root = !object;

	if (scope) {
		chain += `${scope}.${typeof index === 'number' ? `${index}.` : ''}`;
	}

	if (root) {
		object = stew && stew[0] === '{' ? JSON.parse(stew) : {};
	}

	for (const name in attributes) {
		const value = attributes[name];

		if (/^on/.test(name) && Array.isArray(value) && value.length === 1) {
			continue;
		}

		extract(value, reference.getAttribute(name), object, chain);
	}

	children.reduce((index, child, i) => {
		let node = nodes[index];

		if (!node) {
			return index;
		}

		const { nodeValue } = node;
		const list = [];
		let indexed = false;
		
		if (nodeValue !== null) {
			list.push(nodeValue);
		} else if (!child[''][1]) {
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

		list.forEach((node, i) => {
			extract(child, node, object, chain, indexed && i);
		});

		return index + list.length;
	}, 0);

	if (!root) {
		return object;
	}

	const result = {};

	for (const chain in object) {
		const value = object[chain];
		const keys = chain.replace(/\.$/, '').split('.');

		keys.reduce((object, key, i) => {
			if (i === keys.length - 1) {
				if (!object.hasOwnProperty(key)) {
					object[key] = value;
				}

				return;
			}

			const indexed = !isNaN(keys[i + 1] || '.');
			let intermediate = object[key];

			if (typeof intermediate !== 'object') {
				intermediate = indexed ? [] : {};
			} else if (Array.isArray(intermediate) && !indexed) {
				intermediate = { ...intermediate };
			}
			
			object[key] = intermediate;

			return intermediate;
		}, result);
	}

	return result;
}
