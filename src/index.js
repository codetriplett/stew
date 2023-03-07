import reconcile from './reconcile';
import { frameworks, useEffect } from './execute';

const selfClosingTags = new Set([
	'wbr', 'track', 'source', 'param', 'meta', 'link', 'keygen', 'input',
	'img', 'hr', 'embed', 'command', 'col', 'br', 'base', 'area', '!doctype',
]);

const nameMap = {
	className: 'class'
};

export const virtualDocument = {
	createTextNode (nodeValue) {
		return {
			nodeValue,
			toString () {
				return this.nodeValue;
			}
		};
	},
	createDocumentFragment () {
		return {
			childNodes: [],
			appendChild (child) {
				this.childNodes.push(child);
			},
			insertBefore (child, sibling) {
				const { childNodes } = this;
				const index = childNodes.indexOf(sibling);
				childNodes.splice(index, 0, child);
			},
			toString () {
				return this.childNodes.join('');
			},
		};
	},
	createElement (tagName) {
		const fragment = this.createDocumentFragment();

		return Object.assign(fragment, {
			tagName,
			toString () {
				const { childNodes, appendChild, toString, ...attributes } = this;
				let html = `<${tagName}`;

				for (let [name, value] of Object.entries(attributes)) {
					if (!value && value !== 0 || typeof value === 'function') continue;
					name = nameMap[name] || name.replace(/(?=[A-Z])/g, '-').toLowerCase();
					html += ` ${name}="${value === true ? '' : value}"`;
				}
		
				if (selfClosingTags.has(tagName.toLowerCase())) return `${html}>`;
				return `${html}>${this.childNodes.join('')}</${tagName}>`;
			},
		});
	},
};

const defaultDocument = typeof window === 'object' && window.document || virtualDocument;

export function defaultUpdater (node, attributes) {
	for (const [name, value] of Object.entries(attributes)) {
		// add property to node if it needs to be updated
		if (node[name] === value) continue;
		node[name] = value;
	}
}

// rewrite to generate full layout first before interacting with document
// - just use defaultDocument exported from here instead of passing it through context objects
// - then call a separate hydrate function internally to resolve the differences
// - another reconciliation function will be used after hydration that will remove things that don't match instead of storing them
// - memory of active state will still use the ref array, the root of the tree will be stored for later use with the nested refs inside of it

// no longer need to pass document to create renderer
// - the virtual dom object will be agnostic
// - pass document as optional param to render function
// - hydrate will always use window.document and only builds the initial refs and adds event listeners
// - document only needs to be stored in callbacks context and can be retrived from parent callbacks context (parentCallback in context)

export default function stew (container, outline, state = {}, document = defaultDocument, updater = defaultUpdater) {
	if (!container) {
		container = document.createElement('div');
	} else if (typeof container !== 'object') {
		container = document.querySelector(container);
	}

	const { childNodes = [] } = container;
	frameworks.unshift([document, updater]);
	reconcile(outline, state, [{}, {}], 0, container, undefined, [...childNodes]);
	frameworks.shift();
	return container;
};

Object.assign(stew, { useEffect, virtualDocument });

if (typeof window === 'object') {
	window.stew = stew;
} else if (typeof module === 'object') {
	module.exports = stew;
}
