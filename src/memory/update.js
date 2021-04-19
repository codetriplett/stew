import { reconcile } from '../manage';
import { create } from './create';
import { modify } from './modify';
import { transform } from './transform';

export function update (memory, container, i, refs, elm, ctx, sibling) {
	const { '': [children = []] = [] } = container || {};
	let { '': [content, key, tag], ...props } = memory;
	memory = key && typeof key === 'string' ? refs[key] : children[i];

	if (!memory || tag !== memory[''][2]) {
		memory = create(tag, elm, tag ? ctx : content);
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
