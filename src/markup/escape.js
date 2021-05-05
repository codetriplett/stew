const characters = {
	'&': '&amp;', '"': '&quot;', '\'': '&#39;', '<': '&lt;', '>': '&gt;'
};

export function escape (string) {
	if (typeof string === 'number') return String(string);
	else if (typeof string !== 'string') return '';
	return string.replace(/[&"'<>]/g, match => characters[match]);
}
