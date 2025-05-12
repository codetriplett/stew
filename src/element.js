import { isServer, nameMap } from './document';
import render, { remove, reconcile } from './view';

function updateAttributes (node, attributes, prevNames, nextNames = new Set()) {
	for (const [name, value] of Object.entries(attributes)) {
		prevNames.delete(name);
		nextNames.add(name);

		if (name === 'style' || name === 'dataset') {
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
			node.removeAttribute(nameMap[objectName] || objectName);
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

function overrideAttributes (node, map, attributes, overrides) {
	const { '': prevNames } = map;

	if (prevNames.has('ref')) {
		return;
	}

	const nextNames = updateAttributes(node, { ...attributes, ...overrides }, prevNames);
	map[''] = nextNames;
	return nextNames;
}

export default function renderElement (info, object, children, context, document, nodes) {
	const { ref, ...props } = object;
	let [tagName, map, node] = info;

	if (!node && tagName !== '') {
		const { shadowrootmode } = props;

		// TODO: don't require shadowroot to be in template (followup feature)
		// - have server side include it in HTML
		// - have client side attach and use shadowRoot in its place to reconcile children
		// - the actual DOM element that wraps the shadowRoot should be added to nodes for parent's reconciliation
		// - how to we store both wrapper element and shadow node in info array? try not to add extra checks. 
		if (!isServer && shadowrootmode && tagName?.toUpperCase?.() === 'TEMPLATE') {
			const [parentNode] = nodes;
			node = parentNode.shadowRoot || parentNode.attachShadow({ mode: shadowrootmode });
		} else {
			node = document.createElement(typeof tagName === 'number' ? `h${tagName}` : tagName);
		}

		info[2] = node;
	}

	if (node) {
		if ('tagName' in node) {
			nodes.push(node);
		}

		let { onhover, ...attributes } = props;
		const { onclick } = attributes;
		const { '': prevNames = new Set() } = map || {};
		const nextNames = new Set();
		map = { '': nextNames };
		nodes = [node];

		if (prevNames.has('')) {
			nextNames.add('');

			if (prevNames.has('ref')) {
				nextNames.add('ref');
				attributes = { ...attributes, ...onclick };
			} else {
				attributes = { ...attributes, ...onhover };
			}
		} else if (onclick || onhover) {
			if (typeof onclick === 'object') {
				attributes.onclick = () => {
					const nextNames = overrideAttributes(node, map, { ...attributes, ...onclick });
					nextNames?.add?.('')?.add?.('ref');
				};
			}
			
			if (typeof onhover === 'object') {
				Object.assign(attributes, {
					onmouseenter: () => {
						const nextNames = overrideAttributes(node, map, { ...attributes, ...onhover });
						nextNames?.add?.('');
					},
					onmouseleave: () => {
						const nextNames = overrideAttributes(node, map, attributes);
						nextNames?.delete?.('');
					},
				});
			}
		}

		if (Array.isArray(ref)) {
			ref.push(node);
		}

		updateAttributes(node, attributes, prevNames, nextNames);
	} else {
		context = { ...context, ...props };
		map = {};
	}

	const [parentNode] = nodes;
	const refIndex = nodes.length;
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

	if (node) {
		reconcile(parentNode, nodes.slice(1), [...parentNode.childNodes]);
	} else if (Array.isArray(ref)) {
		ref.push(nodes.slice(refIndex));
	}
}
