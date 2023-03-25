import reconcile, { defaultProps, checkPersistence } from './reconcile';
import activate, { impulses, frameworks } from './activate';
import observe, { cues } from './observe';

// tags that shouldn't wrap content when server rendered
const selfClosingTags = new Set([
	'wbr', 'track', 'source', 'param', 'meta', 'link', 'keygen', 'input',
	'img', 'hr', 'embed', 'command', 'col', 'br', 'base', 'area', '!doctype',
]);

// attributes that are different when server rendered, beyond hyphenation
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

				let html = `<${tagName === '!doctype' ? '!DOCTYPE' : tagName}`;

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

export function defaultUpdater (element, props, prevNames) {
	const { tagName } = element;
	const defaultElement = defaultProps[tagName.toLowerCase()] || {};
	prevNames = new Set(prevNames);

	const changes = Object.entries(props).filter(([name, value]) => {
		prevNames.delete(name);
		const currentValue = ~name.indexOf('-') ? element.getAttribute(name) : element[name];
		return value !== currentValue;
	});

	for (const name of prevNames) {
		const defaultValue = ~name.indexOf('-') ? defaultElement.getAttribute(name) : defaultElement[name];
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

const defaultDocument = typeof window === 'object' && window.document || virtualDocument;

export default function stew (container, ...params) {
	if (typeof container === 'string' && !/#|\./.test(container)) {
		const sets = container.trim().split(/\s+/);
		const props = {};

		for (const set of sets) {
			// read names and set initial value
			let [name, setterName, cueName] = set.trim().split(/:/);
			const isCue = !setterName && cueName;
			if (isCue) setterName = cueName;
			props[name] = params.shift();
			
			// include setter
			if (setterName) {
				props[setterName] = function (value) {
					this[name] = value;
				};
			}

			// store setter as cue
			if (isCue) cues.set(props[cueName], name);
		}

		return props;
	} else if (typeof container === 'function') {
		// process detached impulse
		const [parentImpulse] = impulses;
		const [deps, state] = params;
		if (!parentImpulse) return activate(container);
		const { detachedImpulses, detachedIndex } = parentImpulse;
		const view = detachedImpulses[detachedIndex] || [];
		const persist = checkPersistence(view, deps);
		detachedImpulses[detachedIndex] = view;
		parentImpulse.detachedIndex++;
		return persist ? view[0] : view[0] = activate(container, view[0]);
	} else if (typeof container === 'object' && !params.length) {
		// process detached state
		return observe(container);
	}

	let [outline, state = {}, document = defaultDocument, updater = defaultUpdater] = params;

	if (typeof container !== 'object') {
		// use existing container or create a new one
		container = document?.querySelector?.(container) || create(container, document);
	}

	// prepare hydrate nodes and load framework
	const view = [container, {}];
	const dom = { container };
	const hydrateNodes = [...container.childNodes];
	const framework = [document, updater];
	frameworks.unshift(framework);
	reconcile(outline, state, view, 0, dom, hydrateNodes);
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
