export function escape (string) {
	if (typeof string !== 'string') return string;

	return string.replace(/[&<>"']/g, match => {
		switch (match) {
			case '&': return '&amp;';
			case '<': return '&lt;';
			case '>': return '&gt;';
			case '"': return '&quot;';
			case '\'': return '&#39;';
		}
	});
}
