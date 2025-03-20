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

import { processEffects } from './state';
import render from './view';

// tags that shouldn't wrap content when server rendered
const selfClosingTags = new Set([
	'wbr', 'track', 'source', 'param', 'meta', 'link', 'keygen', 'input',
	'img', 'hr', 'embed', 'command', 'col', 'br', 'base', 'area', '!doctype',
]);

// attributes that are different when server rendered, beyond hyphenation
const nameMap = {
	className: 'class',
	tabIndex: 'tabindex',
};

function findMatches (nodes, selectors, matches) {
	for (const node of nodes) {
		if (!('tagName' in node)) {
			continue;
		}

		const nodeClasses = new Set((node.className || '').trim().split(/\s+/));

		for (const [query, ...childQueries] of selectors) {
			const [tagName, id, ...classes] = query;
			let childSelectors = selectors;

			const isMatch = (!tagName || tagName === node.tagName)
				&& (!id || id === node.id)
				&& classes.every(item => nodeClasses.has(item));

			if (isMatch) {
				if (!matches) {
					return node;
				} else if (!childQueries.length) {
					matches.add(node);
				} else {
					childSelectors = [childQueries, ...childSelectors];
				}
			}

			const childNode = findMatches(node.childNodes, childSelectors, matches);

			if (childNode) {
				return childNode;
			}
		}
	}
}

function parseSelector (selector) {
	return selector.trim().split(/\s*,\s*/).map(selector => {
		return selector.split(/\s+/).map(level => {
			const items = level.split('.');
			const [tagName, id = ''] = items.shift().split('#');
			items.unshift(tagName, id);
			return items;
		});
	});
}

function writeChildNodes (parentNode) {
	const { tagName, childNodes, innerHTML } = parentNode;

	if (typeof innerHTML === 'string') {
		return innerHTML;
	}

	const allChildNodes = [];
	let wasTextNode = false;

	for (const node of childNodes) {
		const isTextNode = 'nodeValue' in node;
		if (wasTextNode && isTextNode) allChildNodes.push('<!---->');
		allChildNodes.push(node);
		wasTextNode = isTextNode;
	}

	if (tagName === 'style' || tagName === 'script') {
		const [firstChild = ''] = allChildNodes;
		return firstChild.nodeValue.replace(/<\//, '&lt;/');
	}

	return allChildNodes.join('');
}

export const virtualDocument = {
	createTextNode (nodeValue) {
		return {
			nodeValue,
			toString () {
				return this.nodeValue.replace(/\&/, '&amp;').replace(/</, '&lt;').replace(/>/g, '&gt;');
			}
		};
	},
	createDocumentFragment () {
		return {
			childNodes: [],
			appendChild (child) {
				this.removeChild(child);
				this.childNodes.push(child);
			},
			insertBefore (child, sibling) {
				const { childNodes } = this;
				this.removeChild(child);
				const index = childNodes.indexOf(sibling);
				childNodes.splice(index, 0, child);
			},
			removeChild (child) {
				const { childNodes } = this;
				const index = childNodes.indexOf(child);

				if (index === -1) {
					childNodes.splice(index, 1);
				}
			},
			querySelector (selector) {
				const selectors = parseSelector(selector);
				return findMatches(this.childNodes, selectors) || null;
			},
			querySelectorAll (selector) {
				const selectors = parseSelector(selector);
				const matches = new Set();
				findMatches(this.childNodes, selectors, matches);
				return [...matches];
			},
			toString () {
				return writeChildNodes(this);
			},
		};
	},
	createElement (tagName) {
		return {
			tagName: tagName.toUpperCase(),
			style: {},
			dataset: {},
			mode: null,
			...this.createDocumentFragment(),
			toString () {
				let html = `<${tagName === '!doctype' ? '!DOCTYPE' : tagName}`;
				const attributeEntries = Object.entries(this).filter(([name]) => !staticAttributeNames.has(name));
				const styleEntries = Object.entries(this.style);
				const datasetEntries = Object.entries(this.dataset);
				let content = writeChildNodes(this);

				if (isServer) {
					attributeEntries.sort(([a], [b]) => a.localeCompare(b));
					styleEntries.sort(([a], [b]) => a.localeCompare(b));
					datasetEntries.sort(([a], [b]) => a.localeCompare(b));
				}

				for (let [name, value] of attributeEntries) {
					if (!value && value !== 0 || typeof value === 'function' || /['"&<>]/.test(name)) {
						continue;
					}

					name = nameMap[name] || name.replace(/(?=[A-Z])/g, '-').toLowerCase();
					html += ` ${name}${value === true ? '' : `="${String(value).replace(/"/g, '&quot;')}"`}`;
				}

				const styleString = styleEntries.map(([name, value]) => {
					return `${name.replace(/(?=[A-Z])/g, '-').toLowerCase()}:${value};`;
				}).join('');
				
				if (styleString) html += ` style="${styleString}"`;

				for (const [name, value] of datasetEntries) {
					html += ` data-${name}${value === true ? '' : `="${String(value).replace(/"/g, '&quot;')}"`}`;
				}

				if (this.mode !== null) {
					content = `<template shadowrootmode="${this.mode}">${content}</template>`;
				}

				if (selfClosingTags.has(tagName)) {
					return `${html}>`;
				}

				return `${html}>${content}</${tagName}>`;
			},
		};
	},
};

export const isServer = typeof window !== 'object';
const defaultDocument = isServer ? virtualDocument : window.document;

export default function stew (layout, node, context = {}, document = defaultDocument) {
	if (!node) {
		node = document.createDocumentFragment();
	} else if (typeof node === 'string') {
		node = document.querySelector(node);
	}

	render(layout, context, document, [node], [null, {}, node], 0, {});
	processEffects();
	return node;
};
