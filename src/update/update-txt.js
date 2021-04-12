export function updateTxt (memory, content) {
	const { '': [prev, node] } = memory;
	if (content !== prev) node.nodeValue = memory[''][0] = content;
}
