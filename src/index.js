import { virtualDocument, isServer } from './document';
import { processEffects } from './impulse';
import render from './view';

const defaultDocument = isServer ? virtualDocument : globalThis.document;

export function execute (callback, ...params) {
	try {
		return callback?.(...params);
	} catch (err) {
		console.error(err);
	}
}

export function hotSwap (ref, manifest) {
	// locate and replace all callback tagNames that exist as keys in manifest (WeakMap) with their values, then schedule them to update
}

export default function stew (node, context = {}, ...children) {
	let document = defaultDocument;

	if (node?.createDocumentFragment) {
		document = node;
		node = document.body;
	}

	if (!node) {
		node = document.createDocumentFragment();
	} else if (typeof node === 'string') {
		node = document.querySelector(node);
	}

	const layout = [node, {}, ...children];
	const ref = render(layout, context, document, [node], ['', {}], 0, {});
	processEffects();
	return ref;
};
