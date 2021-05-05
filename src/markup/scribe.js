import { escape } from './escape';
import { parse } from './parse';

export const singletons = [
	'wbr', 'track', 'source', 'param', 'meta', 'link', 'keygen', 'input',
	'img', 'hr', 'embed', 'command', 'col', 'br', 'base', 'area', '!doctype'
];

export function scribe (outline, sibling) {
	if (Array.isArray(outline)) {
		outline = { '': [outline,, ''] };
	} else if (!outline && outline !== 0 || outline === true
		|| typeof outline === 'function') {
		return '';
	} else if (typeof outline !== 'object') {
		outline = { '': [String(outline)] };
	}

	let { '': [content,, tag, params] = [], ...props } = outline;

	if (tag === undefined) {
		let value = escape(content);
		if (sibling && !sibling.startsWith('<')) value += '<!-- -->';
		return value;
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
	} else if (tag === '' && params) {
		content = params.map(it => {
			if (typeof it === 'function') it = it();
			return typeof it === 'string' ? parse(it) : it;
		});
	}

	if (tag === 'script' || tag === 'style') {
		children = content.filter(it => typeof it === 'string');
	} else {
		content.reduceRight((sibling, it, i) => {
			return (children[i] = scribe(it, sibling)) || sibling;
		}, sibling);
	}

	tags.splice(tags.length && 1, 0, ...children);
	return tags.join('');
}
