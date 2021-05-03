export function locate (children) {
	for (const memory of children) {
		if (typeof memory !== 'object') continue;
		let { '': [content, node] } = memory;

		if (node instanceof Element || node instanceof Text) return node;

		node = locate(content);
		if (node) return node;
	}
}
