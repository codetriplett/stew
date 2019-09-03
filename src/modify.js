export function modify (values, name) {
	const value = typeof values[0] === 'boolean' ? values[0] : values.join('');

	if (value === false) {
		return '';
	} else if (value === true) {
		return name ? ` ${name}` : '';
	}

	return name ? ` ${name}="${value}"` : value;
}
