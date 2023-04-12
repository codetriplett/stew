import { frameworks } from './dom';

export const managedProps = new WeakMap();

export function processText (text, view = []) {
	const nodeValue = String(text);
	let [node] = view;

	if (!node || !('nodeValue' in node)) {
		// create new text node
		const [[document]] = frameworks;
		node = document.createTextNode(nodeValue);
		return [node];
	}

	// claim text node and update if necessary
	if (nodeValue !== node.nodeValue) node.nodeValue = nodeValue;
	return view;
};

export default function processElement (tagName, obj, view) {
	const [framework] = frameworks;
	const [document, updater, defaultProps] = framework;
	let [node] = view;

	if (!('keyedViews' in view) || tagName !== node?.tagName?.toLowerCase?.()) {
		// register defaults if not yet done
		if (!Object.prototype.hasOwnProperty.call(defaultProps, tagName)) {
			const example = document.createElement(tagName);
			defaultProps[tagName] = example;
		}

		// create new element and attach to dom
		node = document.createElement(tagName);
		view = Object.assign([node], { keyedViews: {} });
	}
	
	// update attributes
	if (obj) {
		const prevNames = managedProps.get(node);
		updater(node, obj, prevNames, defaultProps[node.tagName.toLowerCase()]);
		managedProps.set(node, Object.keys(obj));
	}

	return view;
}
