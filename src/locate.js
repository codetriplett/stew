export function locate (candidate, tag, index, count) {
	const { tagName: name = '', parentElement: container } = candidate;
	const nodes = [];

	while (candidate) {
		if (count) {
			count--;
		}

		const id = name && candidate.getAttribute('data--') || '';
		const [prefix, suffix] = id.match(/^(\d+)?.*?(\d+)?$/).slice(1);
		const related = String(prefix) === String(index);
		const identified = related && String(suffix) === String(count);
		let node = candidate

		if (!identified) {
			if (!tag) {
				node = document.createTextNode('');
			} else if (related && suffix > count) {
				container.removeChild(node);
				node = undefined;

				continue;
			} else {
				node = document.createElement(tag);

				if (index) {
					const iteration = count ? `-${count}` : '';
					node.setAttribute('data--', `${index}${iteration}`);
				}
			}
		}

		if (node) {
			nodes.push(node);
		}

		if (!count) {
			break;
		} else if (identified || !node) {
			candidate = candidate.previousSibling;
		}
	}

	return count === undefined ? nodes[0] : nodes;
}
