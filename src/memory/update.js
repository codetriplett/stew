import { reconcile } from '../manage';
import { create } from './create';
import { modify } from './modify';
import { transform } from './transform';

export function update (memory, container, i, elm, ctx, sibling) {
	const { '': [children = []] = [] } = container || {};
	let { '': [content, key, tag], ...props } = memory;
	const targeted = ctx && key && typeof key === 'string';
	memory = targeted ? ctx[''][1][key] : children[i];

	if (!memory || tag !== memory[''][2]) {
		memory = create(tag, elm, tag ? ctx : content);
		if (targeted) ctx[''][1][key] = memory;
	}

	if (typeof tag === 'function') {
		content = transform(memory, props, content);
		ctx = memory;
	} else if (tag !== '') {
		sibling = modify(memory, props, content);
		elm = memory;
	}

	if (Array.isArray(content)) reconcile(memory, content, elm, ctx, sibling);
	return memory;
}
