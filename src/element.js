import { isServer } from './document';
import render, { remove, reconcile } from './view';

export default function renderElement (info, object, children, context, document, nodes) {
	const { ref, ...props } = object;
	let [tagName, map, node] = info;

	if (!node && tagName !== '') {
		const { shadowrootmode } = props;

		if (!isServer && typeof shadowrootmode === 'boolean' && tagName?.toUpperCase?.() === 'TEMPLATE') {
			node = parentNode.shadowRoot || parentNode.attachShadow({ mode: shadowrootmode });
		} else {
			node = document.createElement(typeof tagName === 'number' ? `h${tagName}` : tagName);
		}

		info[2] = node;
	}

	if (node) {
		if (node !== tagName) {
			nodes.push(node);
		}

		const { '': prevNames = new Set() } = map || {};
		let nextNames = new Set();
		map = { '': nextNames };
		nodes = [node];

		for (const [name, value] of Object.entries(props)) {
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
				node.removeAttribute(objectName);
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
	} else {
		node = nodes.slice(refIndex);
	}

	if (Array.isArray(ref)) {
		ref.push(node);
	}
}
