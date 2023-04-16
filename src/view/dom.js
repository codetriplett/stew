import stew from '..';

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
		if (!('tagName' in node)) continue;
		const nodeClasses = new Set((node.className || '').trim().split(/\s+/));

		for (const [query, ...childQueries] of selectors) {
			const [tagName, id, ...classes] = query;
			let childSelectors = selectors;

			const isMatch = (!tagName || tagName === node.tagName) &&
				(!id || id === node.id) && classes.every(item => nodeClasses.has(item));

			if (isMatch) {
				if (!matches) return node;
				else if (!childQueries.length) matches.add(node);
				else childSelectors = [childQueries, ...childSelectors];
			}

			const childNode = findMatches(node.childNodes, childSelectors, matches);
			if (childNode) return childNode;
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
			parentElement: null,
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
				return this.childNodes.join('');
			},
		};
	},
	createElement (tagName) {
		const fragment = this.createDocumentFragment();

		return Object.assign(fragment, {
			tagName,
			style: {},
			setAttribute (name, value) {
				if (!staticAttributeNames.has(name)) this[name] = value;
			},
			getAttribute (name) {
				if (!staticAttributeNames.has(name)) return this[name];
			},
			removeAttribute (name) {
				if (!staticAttributeNames.has(name)) this[name] = undefined;
			},
			toString () {
				let html = `<${tagName === '!doctype' ? '!DOCTYPE' : tagName}`;
				const attributeEntries = Object.entries(this).filter(([name]) => !staticAttributeNames.has(name));
				const styleEntries = Object.entries(this.style);

				if (!stew.isServer) {
					attributeEntries.sort(([a], [b]) => a.localeCompare(b));
					styleEntries.sort(([a], [b]) => a.localeCompare(b));
				}

				for (let [name, value] of attributeEntries) {
					if (!value && value !== 0 || typeof value === 'function' || /['"&<>]/.test(name)) continue;
					name = nameMap[name] || name.replace(/(?=[A-Z])/g, '-').toLowerCase();
					html += ` ${name}${value === true ? '' : `="${String(value).replace(/"/g, '&quot;')}"`}`;
				}

				const styleString = styleEntries.map(([name, value]) => {
					return `${name.replace(/(?=[A-Z])/g, '-').toLowerCase()}:${value};`;
				}).join('');

				if (styleString) html += ` style="${styleString}"`;
				if (selfClosingTags.has(tagName)) return `${html}>`;
				return `${html}>${this.childNodes.join('')}</${tagName}>`;
			},
		});
	},
};

const staticAttributeNames = new Set(Object.keys(virtualDocument.createElement('div')));

export function defaultUpdater (element, props, prevNames, defaultElement, ignoreRef) {
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
		if (name === 'ref') {
			if (ignoreRef) continue;
			if (typeof value === 'function') value(element);
			else if (Array.isArray(value)) value.unshift(element);
		} else if (name === 'style') {
			const entries = Object.entries(value);
			const { style } = element;

			for (const [name, value] of entries) {
				if (style[name] === String(value)) continue;
				style[name] = value;
			}
		} else if (staticAttributeNames.has(name)) {
			continue;
		} else if (!~name.indexOf('-')) {
			element[name] = value;
		} else if (value === undefined || value === null) {
			element.removeAttribute(name);
		} else {
			element.setAttribute(name, value === true ? '' : value);
		}
	}
}

export const frameworks = [];
export const isClient = typeof window === 'object';
export const virtualFramework = [virtualDocument, defaultUpdater, {}];
const defaultDocument = isClient && window.document || virtualDocument;
export default [defaultDocument, defaultUpdater, {}];
