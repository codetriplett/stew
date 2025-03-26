import { virtualDocument, isServer } from './document';
import { processEffects } from './impulse';
import render from './view';
import { schedule } from './state';

const defaultDocument = isServer ? virtualDocument : globalThis.document;

export function execute (callback, ...params) {
	try {
		return callback?.(...params);
	} catch (err) {
		console.error(err);
	}
}

function hotSwapStep (ref, manifest, subscriptions) {
	if (!Array.isArray(ref)) {
		return;
	}

	const [callback,, impulse, ...children] = ref;

	if (!Array.isArray(impulse)) {
		children.map(childRef => hotSwapStep(childRef, manifest, subscriptions))
		return;
	}

	const replacement = manifest.get(callback);

	if (replacement) {
		ref[0] = replacement;
		subscriptions.add(impulse);
	}

	const proxy = impulse[2];
	hotSwapStep(proxy, manifest, subscriptions);
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

		if (!node) {
			return;
		}
	}

	const layout = [node, {}, ...children];
	const ref = render(layout, context, document, [node], ['', {}], 0, {});
	processEffects();

	return Object.assign(manifest => {
		if (!manifest) {
			return node;
		}

		const subscriptions = new Set();
		hotSwapStep(ref, manifest, subscriptions);
		schedule(subscriptions);
	}, {
		toString: () => String(node),
	});
};
