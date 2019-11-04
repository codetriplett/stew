export function stringify (template) {
	if (Array.isArray(template)) {
		return `[${template.map(stringify).join(',')}]`;
	} else if (typeof template === 'string') {
		return `'${template}'`;
	} else if (typeof template !== 'object') {
		return String(template);
	}

	return `{${Object.keys(template).map(key => {
		const value = stringify(template[key]);

		if (!/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(key)) {
			key = `'${key}'`;
		}

		return `${key}:${value}`;
	}).join(',')}}`;
}
