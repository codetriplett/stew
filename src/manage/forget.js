export function forget (memory, elm) {
	if (typeof memory === 'function') return memory();
	if (typeof memory !== 'object') return;

	const { '': [, container] } = elm;
	const { '': [fragment, node] } = memory;

	if (node instanceof Element || node instanceof Text) elm = memory;

	if (Array.isArray(fragment)) {
		for (const memory of fragment) forget(memory, elm);
	}

	if (elm === memory) container.removeChild(node);
}
