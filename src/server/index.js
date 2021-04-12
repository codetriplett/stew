import { escape } from './escape';
import { flatten } from './flatten';

const singletons = [
	'wbr', 'track', 'source', 'param', 'meta', 'link', 'keygen', 'input',
	'img', 'hr', 'embed', 'command', 'col', 'br', 'base', 'area', '!doctype'
];

export function server (type, ...content) {
	const customized = typeof type === 'function';
	const textual = !customized && !content.length;
	const { '': key, ...props } = content.shift() || {}
	const tags = [];

	if (customized) {
		let state;

		props[''] = input => {
			if (typeof input !== 'object') return state || {};
			return state = state || input;
		};

		content = type(props, content || []);
		if (!Array.isArray(content)) content = [content];
	} else if (textual) {
		return !type && type !== 0 || type === true ? '' : escape(type);
	} else if (type !== '') {
		const attributes = Object.entries(props).reduce((all, [name, value]) => {
			if (name.startsWith('on')) {
				value = 'javascript:void(0);';
			} else if (!/^[a-zA-Z0-9-_.]+$/.test(name)
				|| !value && value !== '' && value !== 0) {
				return all;
			}
			
			if (name === 'style') {
				value = Object.entries(value).map(([name, value]) => {
					if (!/^[a-zA-Z0-9-_.]+$/.test(name)) return '';
					return `${name}:${escape(value)};`;
				}).join('');
			} else if (Array.isArray(value)) {
				value = value.filter(it => it && typeof it === 'string').join(' ');
			}

			return value === true ? `${all} ${name}` : `${all} ${name}="${escape(value)}"`;
		}, '');

		tags.push(`<${type}${attributes}>`);
		if (~singletons.indexOf(type)) content = undefined;
		else tags.push(`</${type}>`);
	}

	if (Array.isArray(content)) tags.splice(tags.length && 1, 0, ...flatten(content));
	return tags.join('');
}
