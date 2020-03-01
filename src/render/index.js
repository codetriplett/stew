import { traverse } from './traverse';
import { modify } from './modify';

export function render ([value, attributes, children = ''], element) {
	if (attributes) {
		attributes = Object.entries(attributes).map(it => modify(it, element));

		if (children) {
			children = traverse(children, element);
	
			if (!element) {
				children = `${children.join('')}</${value}>`;
			}
		}

		if (!element) {
			return `<${value}${attributes.join('')}>${children}`;
		}
	} else if (!element) {
		return value;
	} else if (element.nodeValue !== value) {
		element.nodeValue = value;
	}

	return element.previousSibling;
}
