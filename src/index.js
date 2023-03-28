import reconcile from './reconcile';
import createImpulse, { useMemo, useEffect, createState } from './activate';

// tags that shouldn't wrap content when server rendered
const selfClosingTags = new Set([
	'wbr', 'track', 'source', 'param', 'meta', 'link', 'keygen', 'input',
	'img', 'hr', 'embed', 'command', 'col', 'br', 'base', 'area', '!doctype',
]);

// attributes that are different when server rendered, beyond hyphenation
const nameMap = {
	className: 'class'
};

export const frameworks = [];

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
				this.removeChild(child);
				this.childNodes.push(child);
				child.parentElement = this;
			},
			insertBefore (child, sibling) {
				const { childNodes } = this;
				this.removeChild(child);
				const index = childNodes.indexOf(sibling);
				childNodes.splice(index, 0, child);
				child.parentElement = this;
			},
			removeChild (child) {
				const { childNodes } = this;
				const index = childNodes.indexOf(child);
				if (index === -1) return;
				childNodes.splice(index, 1);
				child.parentElement = null;
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
			style: {},
			toString () {
				const {
					appendChild, insertBefore, removeChild, toString,
					tagName, style, childNodes, parentElement, ...attributes
				} = this;

				let html = `<${tagName === '!doctype' ? '!DOCTYPE' : tagName}`;

				for (let [name, value] of Object.entries(attributes)) {
					if (!value && value !== 0 || typeof value === 'function') continue;
					name = nameMap[name] || name.replace(/(?=[A-Z])/g, '-').toLowerCase();
					html += ` ${name}="${value === true ? '' : value}"`;
				}
				
				const styleString = Object.entries(style).map(([name, value]) => {
					return `${name}:${value}`;
				}).join(';');

				if (styleString) html += ` style="${styleString}"`;
				if (selfClosingTags.has(tagName.toLowerCase())) return `${html}>`;
				return `${html}>${this.childNodes.join('')}</${tagName}>`;
			},
		});
	},
};

export function defaultUpdater (element, props, prevNames, defaultProps) {
	prevNames = new Set(prevNames);

	const changes = Object.entries(props).filter(([name, value]) => {
		prevNames.delete(name);
		const currentValue = ~name.indexOf('-') ? element.getAttribute(name) : element[name];
		return value !== currentValue;
	});

	for (const name of prevNames) {
		const defaultValue = ~name.indexOf('-') ? defaultElement.getAttribute(name) : defaultProps[name];
		changes.push([name, defaultValue]);
	}

	for (const [name, value] of changes) {
		if (name === 'style') {
			const entries = Object.entries(value);
			const { style } = element;

			for (const [name, value] of entries) {
				if (style[name] === String(value)) continue;
				style[name] = value;
			}
		} else if (!~name.indexOf('-')) {
			element[name] = value;
		} else if (value === undefined || value === null) {
			element.removeAttribute(name);
		} else {
			element.setAttribute(name, value === true ? '' : value);
		}
	}
}

const defaultDocument = typeof window === 'object' && window.document || virtualDocument;
const defaultFramework = [defaultDocument, defaultUpdater, {}];

export default function stew (container, outline, framework = defaultFramework) {
	if (typeof container === 'string') {
		// locate container
		const [document] = framework;
		if (!('querySelector' in document)) return;
		container = document.querySelector(container);
	}

	// prepare hydrate nodes and load framework
	const view = [container, {}];
	const dom = { container };
	const hydrateNodes = [...container.childNodes];
	frameworks.unshift(framework);
	reconcile(outline, {}, view, 0, dom, hydrateNodes);
	frameworks.shift();

	// remove unclaimed nodes
	for (const node of hydrateNodes) {
		container.removeChild(node);
	}
};

export function createElement (tagName, attributes, layout) {
	const container = defaultDocument.createElement(tagName);
	if (layout !== undefined) stew(container, layout);
	if (attributes !== undefined) defaultUpdater(container, attributes);
	return container;
}

Object.assign(stew, {
	useMemo,
	useEffect,
	createElement,
	createState,
	createImpulse: (callback, state) => createImpulse(callback, state),
	virtualFramework: [virtualDocument, defaultUpdater, {}],
});

if (typeof window === 'object') {
	window.stew = stew;
} else if (typeof module === 'object') {
	module.exports = stew;
}
