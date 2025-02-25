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

function writeChildNodes (parentNode) {
	const { tagName, childNodes, innerHTML } = parentNode;
	if (typeof innerHTML === 'string') return innerHTML;
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
				if (index === -1) return;
				childNodes.splice(index, 1);
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
		const fragment = this.createDocumentFragment();

		return Object.assign(fragment, {
			tagName,
			style: {},
			dataset: {},
			mode: null,
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
				const datasetEntries = Object.entries(this.dataset);
				let content = writeChildNodes(this);

				if (isServer) {
					attributeEntries.sort(([a], [b]) => a.localeCompare(b));
					styleEntries.sort(([a], [b]) => a.localeCompare(b));
					datasetEntries.sort(([a], [b]) => a.localeCompare(b));
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

				for (const [name, value] of datasetEntries) {
					html += ` data-${name}${value === true ? '' : `="${String(value).replace(/"/g, '&quot;')}"`}`;
				}

				if (this.mode !== null) {
					content = `<template shadowrootmode="${this.mode}">${content}</template>`;
				}

				if (selfClosingTags.has(tagName)) return `${html}>`;
				return `${html}>${content}</${tagName}>`;
			},
		});
	},
};

const staticAttributeNames = new Set(Object.keys(virtualDocument.createElement('div')));

export function defaultUpdater (element, props, prevNames, defaultElement) {
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
		} else if (name === 'mode') {
			if (!element.shadowRoot) {
				element.attachShadow({ mode: value });
			}
		} else if (name === 'dataset') {
			Object.assign(element.dataset, value);
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

export function find (parentRef, fromIndex) {
	for (let i = fromIndex; i < parentRef.length; i++) {
		const ref = parentRef[i + 2];
		const [node] = ref || [];
		const { tagName } = node || {};

		if (tagName) {
			return node;
		} else if (tagName === '') {
			const node = find(ref, 2);

			if (node) {
				return node;
			}
		}
	}
}

// recursively populate fragments again for transport
function reload (ref) {
	const [node,, ...children] = ref;

	if (node && !node.tagName && node.childNodes?.length === 0) {
		for (const childRef of children) {
			const childNode = reload(childRef);

			if (childNode) {
				node.appendChild(childNode);
			}
		}
	}

	return node;
}

export function insert (ref, parentNode, sibling) {
	const node = reload(ref);

	if (!sibling) {
		parentNode.appendChild(node);
	} else {
		parentNode.insertBefore(node, sibling);
	}

	return node || sibling;
}

// recursively teardown and remove from dom
export function remove (ref, parentNode) {
	const [node, teardown, ...children] = ref;

	if (typeof teardown === 'function') {
		teardown();
	}

	if (!node) {
		return;
	} else if (node.tagName) {
		parentNode.removeChild(node);
	} else {
		for (const childRef of children) {
			remove(childRef, parentNode);
		}
	}
}

export const isServer = typeof window !== 'object';
export const virtualFramework = [virtualDocument, defaultUpdater, 'div'];
export default isServer ? virtualFramework : [window.document, defaultUpdater, 'div'];
