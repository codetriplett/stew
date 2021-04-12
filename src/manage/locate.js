export function locate (children) {
	for (const memory of children) {
		if (typeof memory !== 'object') continue;
		const { '': [fragment, node] } = memory;

		if (node instanceof Element || node instanceof Text) {
			return node;
		} else {
			return locate(fragment);
		}
	}
}
