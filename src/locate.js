export function locate (node, tag, index, count) {
	const generate = typeof node === 'string';
	const hydrate = typeof tag !== 'string';
	let { tagName, parentElement, previousSibling, nextSibling } = node;
	let candidate = generate ? [node] : node;

	if (hydrate) {
		candidate = 0;
		index = tag;
		tag = undefined;
	}

	previousSibling = node;

	while (previousSibling) {
		if (count > 0) {
			count--;
		}

		node = previousSibling;
		({ previousSibling } = previousSibling);

		let id = tagName && node.getAttribute('data--') || '';
		const [prefix, suffix] = id.match(/^(\d+)?.*?(\d+)?$/).slice(1);
		const possible = hydrate || !tag === !tagName;
		let identified = possible && String(prefix) === String(index);

		if (identified) {
			if (suffix > count) {
				candidate = previousSibling;
				parentElement.removeChild(node);

				continue;
			} else if (!tag && suffix) {
				count = Number(suffix);
				candidate = candidate || count + 1;
			}

			identified = String(suffix) === String(count);
		}

		if (!identified) {
			if (tag === undefined) {
				candidate = undefined;
				break;
			}
			
			suffix = count !== undefined ? `-${count}` : '';
			id = index !== undefined ? `${index}${suffix}` : '';
			previousSibling = node;
			
			if (generate) {
				node = tag ? `<${tag}${id ? ` data--="${id}"` : ''}` : '';
				candidate.unshift(node);
			} else if (!tag) {
				node = document.createTextNode('');
			} else  {
				node = document.createElement(tag);

				if (id) { 
					node.setAttribute('data--', id);
				}
			}

			if (previousSibling === candidate) {
				candidate = node;
			}

			if (nextSibling) {
				parentElement.insertBefore(node, nextSibling);
			} else if (parentElement) {
				parentElement.appendChild(node);
			}
		}

		if (!count) {
			break;
		} else if (!generate) {
			nextSibling = node;
		}
	}

	return candidate;
}
