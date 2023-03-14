import reconcile from './reconcile';
import { frameworks } from './activate';

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
			toString () {
				const {
					appendChild, insertBefore, removeChild, toString,
					tagName, childNodes, parentElement, ...attributes
				} = this;

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

export function create (selector, document) {
	const [tagName, ...strings] = ` ${selector}`.split(/(?=#|\.|\[)/);
	const node = document.createElement(tagName.slice(1) || 'div');
	const classList = [];

	for (const string of strings) {
		if (string.startsWith('#')) {
			node.id = string.slice(1);
			continue;
		} else if (string.startsWith('.')) {
			classList.push(string.slice(1));
			continue;
		}

		const [, name, value] = string.match(/^\[\s*([^=[]*?)\s*(?:=([^[]*))?\]/);
		if (!name) continue;
		node[name] = value || true;
	}

	node.className = classList.join(' ');
	return node;
}

export default function stew (container, outline, document = defaultDocument, updater = defaultUpdater) {
	if (typeof container !== 'object') {
		// use existing container or create a new one
		container = document?.querySelector?.(container) || create(container, document);
	}

	// prepare hydrate nodes and load framework
	const hydrateNodes = [...container.childNodes];
	frameworks.unshift([document, updater]);
	reconcile(outline, {}, [container, {}], 0, { container }, hydrateNodes);
	frameworks.shift();

	// remove unclaimed nodes
	for (const node of hydrateNodes) {
		container.removeChild(node);
	}

	return container;
};

Object.assign(stew, { document: virtualDocument });

if (typeof window === 'object') {
	window.stew = stew;
} else if (typeof module === 'object') {
	module.exports = stew;
}
