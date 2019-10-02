export function locate (node, tag, index, count) {
	const generate = typeof node === 'string';
	const nodes = generate ? [node] : [];
	let { tagName, parentElement, previousSibling, nextSibling } = node;
	let identified = false;

	if (index !== undefined) {
		index = String(index);
	}

	previousSibling = node;

	while (previousSibling) {
		if (count > 0) {
			count--;
		}

		node = previousSibling;

		if (!generate) {
			const id = tagName && node.getAttribute('data--') || '';
			let [prefix, suffix] = id.match(/^(\d+)?.*?(\d+)?$/).slice(1);

			if (tag && !tagName) {
				prefix = '';
			} else if (!tag) {
				index = prefix;
				count = suffix && Number(suffix);
			}

			({ previousSibling } = previousSibling);
			identified = prefix === index;

			if (identified) {
				if (suffix > count) {
					parentElement.removeChild(node);
					continue;
				}

				identified = String(suffix) === String(count);
			}
		}

		if (!identified) {
			previousSibling = node;

			if (generate) {
				const iteration = count !== undefined ? `-${count}` : '';
				const id = index !== undefined ? ` data--="${index}${iteration}"` : '';

				node = tag ? `<${tag}${id}` : '';
			} else if (!tag) {
				node = document.createTextNode('');
			} else {
				node = document.createElement(tag);

				if (index !== undefined) { 
					const iteration = count ? `-${count}` : '';
					node.setAttribute('data--', `${index}${iteration}`);
				}
			}

			if (nextSibling) {
				parentElement.insertBefore(node, nextSibling);
			} else if (parentElement) {
				parentElement.appendChild(node);
			}
		}

		nodes.unshift(node);

		if (!generate) {
			nextSibling = node;
		}

		if (!count) {
			break;
		}
	}

	return !generate && count === undefined ? nodes[0] : nodes;
}
