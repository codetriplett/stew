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
import { effects, processEffects, processMemo, stack } from './impulse';
import createState, { queue, schedule } from './state';
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

export default function stew (...layout) {
	if (!layout.length) {
		return queue.size ? new Promise(resolve => effects.push([, resolve])) : Promise.resolve();
	}

	const [original] = layout;
	let [node, object = {}] = layout;
	let document = isServer ? stew : globalThis.document || {};

	if (Array.isArray(node)) {
		return compile(...layout);
	} else if (Array.isArray(object)) {
		return processMemo(...layout);
	} else if (node === stew) {
		document = stew;
		node = '';
	}

	if (typeof node === 'function') {
		const { '': _, ...props } = object;
		layout[1] = props;
	} else {
		if (layout.length === 1) {
			return createState(node);
		}
		
		if (typeof node === 'string') {
			node = node ? document.querySelector(node) : document.createDocumentFragment();
		}

		if (!node) {
			console.error(`Element not found: ${node}`);
			return;
		}

		layout[0] = node;
		layout[1] = null;
	}

	stack.unshift([,,,, object]);
	const info = render(layout, { '': object }, document, [], ['', {}], 0, {});
	stack.shift();
	processEffects();

	return node !== original ? node : manifest => {
		const subscriptions = new Set();
		hotSwapStep(info, manifest, subscriptions);
		schedule(subscriptions);
	};
};
