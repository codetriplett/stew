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
					return `${name.replace(/(?=[A-Z])/g, '-').toLowerCase()}:${value}`;
				}).join(';');

				if (styleString) html += ` style="${styleString}"`;
				if (selfClosingTags.has(tagName.toLowerCase())) return `${html}>`;
				return `${html}>${this.childNodes.join('')}</${tagName}>`;
			},
		});
	},
};

export function defaultUpdater (element, props, prevNames, defaultProps, ignoreRef) {
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
const isClient = typeof window === 'object';
const defaultDocument = isClient && window.document || virtualDocument;
export const defaultFramework = [defaultDocument, defaultUpdater, {}];
export default [virtualDocument, defaultUpdater, {}];
Object.assign(defaultFramework, { isServer: !isClient });
