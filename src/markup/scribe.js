import { normalize } from '../memory';
import { escape } from './escape';

export const singletons = [
	'wbr', 'track', 'source', 'param', 'meta', 'link', 'keygen', 'input',
	'img', 'hr', 'embed', 'command', 'col', 'br', 'base', 'area', '!doctype'
];

export function scribe (outline, sibling) {
	let { '': [content,, tag, params] = [], ...props } = outline;

	if (!content) {
		return '';
	} else if (tag === undefined) {
		content = escape(content);
		if (sibling && !sibling.startsWith('<')) content += '<!-- -->';
		return content;
	}

	const tags = [];
	let children = [];
	if (tag) sibling = undefined;

	if (typeof tag === 'function') {
		content = tag({ ...props, '': {} }, content);

		if (!Array.isArray(content)) {
			content = content === undefined ? [] : [content];
		}
	} else if (tag) {
		let attr = Object.entries(props).map(([name, value]) => {
			if (!/^[a-zA-Z0-9-_.]+$/.test(name) || !value && value !== 0) {
				return '';
			} else if (name === 'style') {
				value = Object.entries(value).map(([name, value]) => {
					if (!/^[a-zA-Z0-9-_.]+$/.test(name)) return '';
					name = name.replace(/[A-Z]/g, x => `-${x.toLowerCase()}`);
					value = escape(value);
					return value && `${name}:${value};`;
				}).join('');
			} else if (name.startsWith('on')) {
				value = 'javascript:void(0);';
			} else if (Array.isArray(value)) {
				value = value.filter(it => {
					return it && typeof it === 'string'
				}).join(' ');
			} else if (typeof value === 'object') {
				return '';
			} else {
				value = escape(value);
			}

			return value === true ? name : `${name}="${value}"`;
		}, '');

		if (attr.length) attr = ` ${attr.filter(value => value).join(' ')}`;
		tags.push(`<${tag}${attr}>`);
		if (~singletons.indexOf(tag)) content = [];
		else tags.push(`</${tag}>`);
	}

	if (tag === 'script' || tag === 'style') {
		children = content.filter(it => typeof it === 'string');
	} else {
		const custom = tag === '' && params;
		if (custom) content = params;

		for (let i = content.length - 1; i >= 0; i--) {
			const outline = normalize(content[i], custom);
			const html = outline && scribe(outline, sibling);
			if (html) sibling = children[i] = html;
		}
	}

	tags.splice(tags.length && 1, 0, ...children);
	return tags.join('');
}
