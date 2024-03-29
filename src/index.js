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

import { fibers } from './state/fiber';
import { populateChildren, prepareCandidates } from './view';
import defaultFramework, { frameworks, converters, defaultConverter, virtualFramework } from './view/dom';

export default function stew (container, layout, ...rest) {
	const headingDepth = typeof rest[0] === 'number' ? rest.shift() : 0;
	const converter = typeof rest[0] === 'function' ? rest.shift() : defaultConverter;
	const vars = rest.length && !Array.isArray(rest[0]) ? rest.shift() : {};
	const promises = [];
	let [framework = defaultFramework] = rest;
	const isFragment = container === '';
	const isServer = framework === virtualFramework;

	if (framework.length < 3) {
		// add defaults to incomplete frameworks
		framework = Object.assign([], virtualFramework, framework);
	}

	if (typeof container === 'string') {
		// locate container
		const [document] = framework;
		if (isFragment) container = document.createDocumentFragment();
		else if (isServer) return;
		else container = document.querySelector(container);
	}

	// prepare hydrate nodes and load converter and framework
	const fiber = Object.assign([() => {}], { registry: new Set() });
	const view = Object.assign([container], { keyedViews: {} });
	const candidates = isServer ? undefined : prepareCandidates(container);
	const dom = { container, candidates };
	frameworks.unshift(framework);
	converters.unshift([headingDepth, converter, vars, promises]);
	fibers.unshift(fiber);
	fibers.isServer = isServer;
	populateChildren([layout], vars, view, dom);
	fibers.isServer = undefined;
	fibers.shift();
	converters.shift();
	frameworks.shift();
	dom.candidates = undefined;

	// return as promise if custom converter was used and only return container if it was created here
	let result = isFragment ? container : undefined;
	return converter !== defaultConverter ? Promise.all(promises).then(() => result) : result;
};
