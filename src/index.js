import { parse, scribe } from './markup';
import { update } from './memory';

export default function stew (first, ...rest) {
	if (Array.isArray(first)) {
		return parse(first, ...rest);
	} else if (typeof first !== 'object') {
		const { '': key, ...props } = rest.shift() || {};
		return { '': [rest, key, first || ''], ...props };
	}

	const { '': node = 'div', ...props } = first;
	if (typeof node === 'string') return scribe(stew(node, props, ...rest));
	else if (!(node instanceof Element)) return;

	const { tagName, childNodes } = node;
	const tag = tagName.toLowerCase();
	const refs = { '': { '': () => {} } };
	const elm = { '': [[], node, tag, [...childNodes]] };
	const ctx = { '': [[], refs, () => {}] };
	return update(stew(tag, props, ...rest), elm, 0, refs, elm, ctx);
}
