export function extract (template, reference, object) {
	if (typeof template !== 'object') {
		return object;
	} else if (Array.isArray(template) && typeof reference === 'string') {
		const [prefix, key, suffix] = template;
		const suffixIndex = -suffix.length || undefined;

		object[key] = reference.slice(prefix.length, suffixIndex);

		return object;
	} else if (Array.isArray(template) || typeof reference === 'string') {
		return object;
	}

	const { '': structure, ...attributes } = template;
	const [scope, childTemplates = []] = structure.slice(1);
	const childNodes = reference.childNodes;
	const stew = reference.getAttribute('data-stew');

	if (!object) {
		object = stew && stew[0] ? JSON.parse(stew) : {};
	}

	for (const name in attributes) {
		extract(attributes[name], reference.getAttribute(name), object);
	}

	childTemplates.forEach((childTemplate, i) => {
		const childNode = childNodes[i];
		const { wholeText: childReference = childNode } = childNode;

		extract(childTemplate, childReference, object);
	});

	return object;
}
