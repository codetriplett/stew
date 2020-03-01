export function locate ([value, attributes], container, sibling) {
	const id = attributes && attributes[''] || '';
	const [index] = id.split('-');
	let element;

	while (container.lastChild) {
		let attribute = '';
		element = sibling ? sibling.previousSibling : container.lastChild;

		if (element && !element.getAttribute === !attributes) {
			if (attributes) {
				attribute = element.getAttribute('data--') || '';
			}

			if (attribute === id) {
				return element;
			}
		}

		if (!element || attributes.match(/^\d*(?=-?)/)[0] <= index) {
			break;
		}

		container.removeChild(element);
	}
	
	if (attributes) {
		element = document.createElement(value);
	} else {
		element = document.createTextNode(value);
	}

	if (sibling) {
		sibling.parentNode.insertBefore(element, sibling);
	} else {
		container.appendChild(element);
	}

	return element;
}
