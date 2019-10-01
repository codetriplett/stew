export function locate (node, tag, index, count) {
	const nodes = [];
	let { tagName, parentElement, previousSibling, nextSibling } = node;
	previousSibling = node;

	while (previousSibling) {
		if (count) {
			count--;
		}

		node = previousSibling;
		({ previousSibling } = previousSibling);

		const id = tagName && node.getAttribute('data--') || '';
		const [prefix, suffix] = id.match(/^(\d+)?.*?(\d+)?$/).slice(1);
		const related = String(prefix) === String(index);
		const identified = related && String(suffix) === String(count);

		if (!identified) {
			if (related && suffix > count) {
				parentElement.removeChild(node);
				continue;
			}

			previousSibling = node;

			if (!tag) {
				node = document.createTextNode('');
			} else {
				node = document.createElement(tag);

				if (index) {
					const iteration = count ? `-${count}` : '';
					node.setAttribute('data--', `${index}${iteration}`);
				}
			}

			if (nextSibling) {
				parentElement.insertBefore(node, nextSibling);
			} else {
				parentElement.appendChild(node);
			}

			nextSibling = node;
		}

		nodes.push(node);

		if (!count) {
			break;
		}
	}

	return count === undefined ? nodes[0] : nodes;
}
