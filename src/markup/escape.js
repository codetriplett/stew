const characters = {
	'&': '&amp;', '"': '&quot;', '\'': '&#39;', '<': '&lt;', '>': '&gt;'
};

export function escape (string) {
	if (typeof string !== 'string') return string;
	return string.replace(/[&"'<>]/g, match => characters[match]);
}
