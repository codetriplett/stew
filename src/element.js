import { nameMap } from './document';
import render, { remove, reconcile } from './view';
import stew from './stew';

function updateAttributes (node, attributes, prevNames, nextNames = new Set()) {
	for (const [name, value] of Object.entries(attributes)) {
		prevNames.delete(name);
		nextNames.add(name);

		if (value && (name === 'style' || name === 'dataset')) {
			const object = node[name];

			for (const [valueName, string] of Object.entries(value)) {
				const fullName = `${name}.${valueName}`;
				prevNames.delete(fullName);
				nextNames.add(fullName);

				if (string !== object[valueName]) {
					object[valueName] = string;
				}
			}
		} else if (value !== node[name]) {
			node[name] = value;
		}
	}

	for (const name of prevNames) {
		const [objectName, valueName] = name.split('.');

		if (valueName === undefined) {
			node[nameMap[objectName] || objectName] = null;
			continue;
		}

		switch (objectName) {
			case 'style': {
				node.style.removeProperty(valueName);
				break;
			}
			case 'dataset': {
				delete node.dataset[valueName];
				break;
			}
		}
	}

	return nextNames;
}

export default function renderElement (info, props, children, context, document, nodes) {
	let [tagName, map, node] = info;

	if (!node && tagName) {
		const { shadowrootmode } = props;

		// TODO: don't require shadowroot to be in template (followup feature)
		// - have server side include it in HTML
		// - have client side attach and use shadowRoot in its place to reconcile children
		// - the actual DOM element that wraps the shadowRoot should be added to nodes for parent's reconciliation
		// - how to we store both wrapper element and shadow node in info array? try not to add extra checks. 
		if (document !== stew && shadowrootmode && tagName.toLowerCase?.() === 'template') {
			const [parentNode] = nodes;
			node = parentNode.shadowRoot || parentNode.attachShadow({ mode: shadowrootmode });
		} else {
			node = document.createElement(typeof tagName === 'number' ? `h${tagName}` : tagName);
		}

		info[2] = node;
	}

	if (node) {
		if (tagName && ('tagName' in node)) {
			nodes.push(node);
		}

		const { onclick } = props;
		const { '': prevNames = new Set() } = map || {};
		const nextNames = new Set();
		map = { '': nextNames };
		nodes = [node];

		if (prevNames.has('')) {
			nextNames.add('');
			props = onclick || {};
		} else if (typeof onclick === 'object') {
			props.onclick = () => {
				map[''] = updateAttributes(node, onclick, nextNames).add('');
			};
		}

		updateAttributes(node, props, prevNames, nextNames);
	} else {
		context = { ...context, ...props };
		map = {};
	}

	const { length } = nodes;
	const [parentNode] = nodes;
	const removeInfos = new Set(info.slice(3));

	for (const [i, childLayout] of children.entries()) {
		const childInfo = render(childLayout, context, document, nodes, info, i, map);

		if (childInfo) {
			removeInfos.delete(childInfo);
		} else if (map === undefined) {
			// shift items in hydration mode for next child to process
			info.splice(i + 3, 0, undefined);
		}
	}

	for (const childInfo of removeInfos) {
		remove(childInfo, parentNode);
	}

	info[1] = map;
	info.splice(children.length + 3);

	if (!node) {
		return nodes.slice(length);
	}
	
	reconcile(node, nodes.slice(1), [...node.childNodes]);
}
