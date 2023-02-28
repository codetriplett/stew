import resolve from './resolve';

const selfClosingTags = new Set([
	'wbr', 'track', 'source', 'param', 'meta', 'link', 'keygen', 'input',
	'img', 'hr', 'embed', 'command', 'col', 'br', 'base', 'area', '!doctype'
]);

const nameMap = {
	className: 'class'
};

export const defaultDocument = {
	createDocumentFragment: () => ({
		childNodes: [],
		appendChild (child) {
			this.childNodes.push(child);
		},
		toString () {
			return this.childNodes.join('');
		},
	}),
	createElement: tag => ({
		childNodes: [],
		appendChild (child) {
			this.childNodes.push(child);
		},
		toString () {
			const { childNodes, appendChild, toString, ...attributes } = this;
			let html = `<${tag}`;
		
			for (let [name, value] of Object.entries(attributes)) {
				if (!value && value !== 0 || typeof value === 'function') continue;
				name = nameMap[name] || name.replace(/(?=[A-Z])/g, '-').toLowerCase();
				html += ` ${name}="${value === true ? '' : value}"`;
			}
	
			if (selfClosingTags.has(tag.toLowerCase())) return `${html}>`;
			return `${html}>${this.childNodes.join('')}</${tag}>`;
		}
	}),
	createTextNode: text => text
};

export default function stew (document = defaultDocument) {
	return (template, state, node) => {
		return resolve(template, { document, state }, [node, {}], 0);
	};
}

if (typeof window === 'object') {
	window.stew = stew;
} else if (typeof module === 'object') {
	module.exports = stew;
}
