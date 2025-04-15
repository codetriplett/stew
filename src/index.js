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

import { isServer } from './document';
import { effects, processEffects, processMemo } from './impulse';
import createState, { schedule } from './state';
import { compile } from './program';
import render from './view';

const defaultDocument = isServer ? stew : globalThis.document;

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


/*

use stew function for hooks as well

stew() // onRender
// promise that resolves after current impulses and queue has been resolved (mostly for testing)

stew(() => {}, deps) // useMemo

stew(() => {}) // useEffect (but not useFetch)
stew(() => {}, deps, fallback) // useFetch/useEffect
// 

*/

// TODO: have the stew function also serve as the virtual document
// - move the properties that existed on virtualDocument on stew function
// - maybe change isServer checks to check wiether document is stew or not
// - might need to set an activeDocument like impulse does for activeRef
// - with this change, all functionality will use the stew library, and that can be the only export
export default function stew (...children) {
	if (!children.length) {
		// stew() // await render (don't add to effects)
		return new Promise(resolve => effects.push([, resolve]));
	}

	let node = children.shift();
	let document = defaultDocument;

	if (node === stew) {
		document = stew;
		node = undefined;
	} else if (typeof node === 'function') {
		return processMemo(node, ...children);
	} else if (Array.isArray(node)) {
		return compile(node, ...children);
	} else if (typeof node === 'object' && !children.length) {
		return createState(node);
	}

	const context = children.shift() || {};

	if (!node) {
		node = document.createDocumentFragment();
	} else if (typeof node === 'string') {
		node = document.querySelector(node);

		if (!node) {
			throw new Error(`Element not found: ${node}`);
		}
	}

	const layout = [node, {}, ...children];
	const ref = render(layout, context, document, [], ['', {}], 0, {});
	processEffects();

	return isServer ? node : manifest => {
		if (manifest) {
			const subscriptions = new Set();
			hotSwapStep(ref, manifest, subscriptions);
			schedule(subscriptions);
		}

		return node;
	};
};
