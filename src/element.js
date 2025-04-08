import { isServer } from './document';
import render, { remove, reconcile } from './view';
import { getInterface } from './program';

export default function renderElement (ref, props, children, context, document, nodes) {
	let [tagName, map, node] = ref;

	if (!node && tagName !== '') {
		const { shadowrootmode } = props;

		if (!isServer && typeof shadowrootmode === 'boolean' && tagName?.toUpperCase?.() === 'TEMPLATE') {
			node = parentNode.shadowRoot || parentNode.attachShadow({ mode: shadowrootmode });
		} else {
			node = document.createElement(typeof tagName === 'number' ? `h${tagName}` : tagName === 'webgl' ? 'canvas' : tagName);
		}

		ref[2] = node;
	}

	if (node) {
		if (node !== tagName) {
			nodes.push(node);
		}

		const { '': prevNames = new Set() } = map || {};
		let nextNames = new Set();
		map = { '': nextNames };
		nodes = [node];

		if (node.tagName === 'CANVAS') {
			const { width, height } = props;
			const gl = node.getContext('webgl');
			context = { ...context, '': gl };
			nodes[0] = getInterface(node);
			
			if (width !== node.width || height !== node.height) {
				gl.viewport(0, 0, width, height);
			}
		}

		for (const [name, value] of Object.entries(props)) {
			prevNames.delete(name);
			nextNames.add(name);

			switch (name) {
				case 'style':
				case 'dataset': {
					const object = node[name];

					for (const [valueName, string] of Object.entries(value)) {
						const fullName = `${name}.${valueName}`;
						prevNames.delete(fullName);
						nextNames.add(fullName);

						if (string !== object[valueName]) {
							object[valueName] = string;
						}
					}

					continue;
				}
				case 'ref': {
					value?.push?.(node);
					continue;
				}
			}

			if (value !== node[name]) {
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
	const removeRefs = new Set(ref.slice(3));

	for (const [i, childLayout] of children.entries()) {
		const childRef = render(childLayout, context, document, nodes, ref, i, map);

		if (childRef) {
			removeRefs.delete(childRef);
		} else if (map === undefined) {
			// shift items in hydration mode for next child to process
			ref.splice(i + 3, 0, undefined);
		}
	}

	for (const childRef of removeRefs) {
		remove(childRef, parentNode);
	}

	ref[1] = map;
	ref.splice(children.length + 3);

	if (node) {
		reconcile(parentNode, nodes.slice(1), [...parentNode.childNodes]);
	}
}
