import { parse, scribe } from './markup';
import { update } from './memory';

export default function stew (first = '', ...rest) {
	if (Array.isArray(first)) {
		return parse(first, ...rest);
	} else if (typeof first !== 'object') {
		const { '': key, ...props } = rest.shift() || {};
		const core = first ? [rest, key, first] : [[], key, first, rest];
		return { '': core, ...props };
	}
	
	const hydrating = first.constructor !== Object;
	if (hydrating) first = { '': first };
	const { '': node = 'div', ...props } = first;
	if (typeof node === 'string') return scribe(stew(node, props, ...rest));
	else if (!(node instanceof Element)) return;

	const tag = node.tagName.toLowerCase();
	const refs = { '': { '': () => {} } };
	const elm = { '': [[],,, hydrating ? [node] : node] };
	const ctx = { '': [[], refs, () => {}] };

	update(stew(tag, props, ...rest), elm, 0, refs, elm, ctx);
	return node;
}
