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

import { frameworks, defaultFramework } from './view/dom';
import reconcileNode from './view';

// BASIC RULES
// - impulse should teardown when there is no longer a view in the layout that originated from it
// - impulses should be added to queues by depth with triggered and queues are resolved from top to bottom
//   - impulses are flagged as queued when triggered and this flag is cleared when processed
//   - impulses in the queue are ignored if they no longer have the queued flag set
export default function stew (container, layout, framework = defaultFramework) {
	let isFragment;

	if (typeof container === 'string') {
		// locate container
		const [document] = framework;
		isFragment = container === '';
		if (isFragment) container = document.createDocumentFragment();
		else if (!('querySelector' in document)) return;
		else container = document.querySelector(container);
	}

	// prepare hydrate nodes and load framework
	const fiber = [,];
	const view = Object.assign([container], { keyedViews: {} });
	const candidates = framework.isServer ? undefined : [...container.childNodes];
	const dom = { container, candidates };
	frameworks.unshift(framework);
	reconcileNode(layout, {}, fiber, view, 0, dom);
	frameworks.shift();

	// remove unclaimed nodes
	if (candidates) {
		for (const node of candidates) {
			container.removeChild(node);
		}
	}

	// only return container if it was created here
	if (isFragment) return container;
};
