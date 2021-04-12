export function createElm (tag, { '': [,,, nodes = []] }) {
	let node, childNodes;

	if (nodes.length) {
		while (nodes.length) {
			node = nodes.pop();

			if (node instanceof Element) {
				childNodes = [...node.childNodes].filter(({ nodeType }) => {
					return nodeType !== Node.COMMENT_NODE;
				});

				break;
			}
		}
	} else {
		node = document.createElement(tag);
	}

	return { '': [[], node, tag, childNodes] };
}
