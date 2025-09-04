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

import virtual, { parseSelector } from './document';
import { effects, processEffects, processMemo, stack } from './impulse';
import { queue, schedule } from './state';
import compile from './program';
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

export default function stew (...layout) {
	if (!layout.length) {
		return queue.size ? new Promise(resolve => effects.push([, [resolve]])) : Promise.resolve();
	}

	let document = globalThis.document || stew;
	const isServer = document === stew;
	let [selector, library, ...rest] = layout;
	let node, props;

	if (Array.isArray(selector)) {
		return compile(...layout);
	} else if (Array.isArray(library)) {
		return processMemo(...layout);
	} else if (typeof selector === 'function') {
		({ '': node, ...props } = library || {});
	} else if (layout.length === 1) {
		return processMemo(selector, []);
	} else if (typeof selector !== 'string') {
		node = selector;
	} else if (!isServer) {
		node = document.querySelector(selector);
	} else {
		const [tagName, id, ...classes] = parseSelector(selector)[0][0];

		if (id) {
			node = document.createElement(tagName || 'div');
			Object.assign(node, { id, className: classes.join(' ') || null });
		} else {
			node = document.createDocumentFragment();

			if (id === '') {
				document = virtual;
			}
		}
	}

	if (!node || typeof node !== 'object') {
		console.error(`Element not found: ${selector}`);
		return;
	}

	library = typeof library === 'object' ? { ...library } : {};
	stack.unshift([,,,, library, document === stew ? null : []]);
	const info = render([node, props, ...rest], library, document, [], ['', {}], 0, {});
	stack.shift();
	processEffects();

	return isServer || document === virtual ? node : manifest => {
		const subscriptions = new Set();
		hotSwapStep(info, manifest, subscriptions);
		schedule(subscriptions);
	};
};
