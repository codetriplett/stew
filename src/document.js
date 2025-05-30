import stew from '.';

// tags that shouldn't wrap content when server rendered
export const selfClosingTags = new Set([
	'wbr', 'track', 'source', 'param', 'meta', 'link', 'keygen', 'input',
	'img', 'hr', 'embed', 'command', 'col', 'br', 'base', 'area', '!doctype',
]);

// attributes that are different when server rendered, beyond hyphenation
export const nameMap = {
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

			const isMatch = (!tagName || tagName.toUpperCase() === node.tagName)
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

function writeChildNodes (childNodes, tagName) {
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

Object.assign(stew, {
	createTextNode (nodeValue) {
		return {
			nodeValue,
			nextSibling: null,
			toString () {
				return this.nodeValue.replace(/\&/, '&amp;').replace(/</, '&lt;').replace(/>/g, '&gt;');
			}
		};
	},
	createDocumentFragment () {
		return {
			childNodes: [],
			nextSibling: null,
			appendChild (child) {
				this.removeChild(child);
				this.childNodes.push(child);
				child.nextSibling = null;
			},
			insertBefore (child, sibling) {
				const { childNodes } = this;
				this.removeChild(child);
				const index = childNodes.indexOf(sibling);
				childNodes.splice(index, 0, child);
				child.nextSibling = sibling;
			},
			removeChild (child) {
				const { childNodes } = this;
				const index = childNodes.indexOf(child);

				if (index !== -1) {
					childNodes.splice(index, 1);
					child.nextSibling = null;
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
				const { childNodes } = this;
				return writeChildNodes(childNodes);
			},
		};
	},
	createElement (tagName) {
		const element = {
			tagName: tagName.toUpperCase(),
			style: {},
			dataset: {},
			...this.createDocumentFragment(),
			toString () {
				const { tagName, childNodes, style, dataset, ...rest } = this;
				const attributeEntries = Object.entries(rest);
				const styleEntries = Object.entries(style);
				const datasetEntries = Object.entries(dataset);
				const lowercaseTagName = tagName.toLowerCase();
				let html = `<${lowercaseTagName === '!doctype' ? '!DOCTYPE' : lowercaseTagName}`;
				let content = writeChildNodes(childNodes, tagName);

				if (html === '<!doctype') {
					html = '<!DOCTYPE';
				}

				if (isServer) {
					attributeEntries.sort(([a], [b]) => a.localeCompare(b));
					styleEntries.sort(([a], [b]) => a.localeCompare(b));
					datasetEntries.sort(([a], [b]) => a.localeCompare(b));
				}

				for (let [name, value] of attributeEntries) {
					if (value === false || value === null || value === undefined || typeof value === 'function' || /['"&<>]/.test(name)) {
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

				if (selfClosingTags.has(lowercaseTagName)) {
					return `${html}>`;
				}

				return `${html}>${content}</${lowercaseTagName}>`;
			},
		};

		const names = new Set(Object.keys(element));
		const { style } = element;

		Object.defineProperty(element, 'removeAttribute', {
			value: name => {
				if (!names.has(name)) {
					delete element[name];
				}
			},
			enumerable: false,
		});

		Object.defineProperty(style, 'removeProperty', {
			value: name => {
				delete style[name];
			},
			enumerable: false,
			writeable: false,
		});

		return element;
	},
	querySelector (selector) {
		return html.querySelector(selector);
	},
	querySelectorAll (selector) {
		return html.querySelectorAll(selector);
	},
});

const [html, head, body] = ['html', 'head', 'body'].map(tagName => stew.createElement(tagName));
html.appendChild(head);
html.appendChild(body);
stew.body = body;
export const isServer = typeof window !== 'object';
