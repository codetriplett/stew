/**
 * @license MIT
 * Copyright (c) 2023 Jeff Triplett
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { virtualDocument, isServer } from './document';
import { processEffects } from './impulse';
import { schedule } from './state';
import { compile } from './program';
import render from './view';

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

	const [callback, impulse, proxy, ...children] = ref;

	if (!Array.isArray(impulse)) {
		children.map(childRef => hotSwapStep(childRef, manifest, subscriptions))
		return;
	}

	const replacement = manifest.get(callback);

	if (replacement) {
		ref[0] = replacement;
		subscriptions.add(impulse);
	}

	hotSwapStep(proxy, manifest, subscriptions);
}

export default function stew (node, ...children) {
	if (Array.isArray(node)) {
		return compile(node, ...children);
	}

	const context = children.shift() || {};
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
