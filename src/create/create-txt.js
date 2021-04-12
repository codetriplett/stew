export function createTxt (text, { '': [,,, nodes = []] }) {
	let node;

	if (!nodes.length) {
		node = document.createTextNode(text);
	} else if (nodes[nodes.length - 1] instanceof Text) {
		node = nodes.pop();
	}

	return { '': [text, node] };
}
