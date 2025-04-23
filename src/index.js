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
import createState, { schedule, unsubscribe } from './state';
import { compile } from './program';
import render from './view';

export function hotSwapStep (info, manifest, subscriptions) {
	if (!Array.isArray(info)) {
		return;
	}

	const [callback, impulse, proxy, ...children] = info;

	if (!Array.isArray(impulse)) {
		children.map(childRef => hotSwapStep(childRef, manifest, subscriptions))
		return;
	}

	const override = manifest.get(callback);

	if (override) {
		info[0] = override;
		subscriptions.add(impulse);
	}

	hotSwapStep(proxy, manifest, subscriptions);
}

export function suspend (info) {
	const [, impulse,, ...children] = info;

	if (Array.isArray(impulse)) {
		unsubscribe(info);
	}

	for (const child of children) {
		suspend(child);
	}
}

export function resume (info, subscriptions) {
	const [, impulse,, ...children] = info;

	if (Array.isArray(impulse)) {
		subscriptions.add(impulse);
		return;
	}

	for (const child of children) {
		resume(child);
	}
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
export default function stew (...params) {
	if (!params.length) {
		// stew() // await render (don't add to effects)
		return new Promise(resolve => effects.push([, resolve]));
	}

	let [node, context, ...children] = params;
	let document, layout;

	if (Array.isArray(node)) {
		return compile(...params);
	} else if (Array.isArray(context)) {
		return processMemo(node, context, ...children);
	} else if (node === stew) {
		document = stew;
		node = '';
	} else if (typeof node === 'function') {
		layout = params;
		context = undefined;
	} else if (params.length === 1) {
		return createState(node);
	} else {
		document = isServer ? stew : globalThis.document;
	}

	if (!layout) {
		if (typeof node === 'string') {
			node = node ? document.querySelector(node) : document.createDocumentFragment();
		}

		if (!node) {
			console.error(`Element not found: ${node}`);
			return;
		}

		layout = [node, {}, ...children];
	}

	const info = render(layout, context, document, [], ['', {}], 0, {});
	processEffects();

	return Object.assign(manifest => {
		switch (typeof manifest) {
			case 'boolean': {
				if (manifest) {
					const subscriptions = new Set();
					resume(info, subscriptions);
					schedule(subscriptions);
				} else {
					suspend(info);
				}

				break;
			}
			case 'function': {
				const override = manifest;
				manifest = new Map();
				manifest.set(info[0], override);
			}
			case 'object': {
				if (!manifest) {
					remove(info);
				} else {
					const subscriptions = new Set();
					hotSwapStep(info, manifest, subscriptions);
					schedule(subscriptions);
				}

				break;
			}

			// TODO: need to suspend and resume webgl animations as well
			// - could just make the duration 0 when returning from pause
		}

		return info[2];
	}, {
		toString: () => String(info[2]),
	});
};
