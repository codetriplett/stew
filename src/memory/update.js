import { reconcile } from '../manage';
import { create } from './create';
import { modify } from './modify';
import { transform } from './transform';

export function update (memory, container, i, refs, elm, ctx, sibling) {
	const { '': [children = []] = [] } = container || {};
	let { '': [content, key, tag, params], ...props } = memory;
	memory = key && typeof key === 'string' ? refs[key] : children[i];

	if (!memory || tag !== memory[''][2]
		|| !tag && !params !== !memory[''][3]) {
		const options = [tag ? ctx : content, tag === '' ? params : props];
		memory = create(tag, elm, ...options);
	}

	if (typeof tag === 'function') {
		content = transform(memory, props, content);
		ctx = memory;
	} else if (tag !== '') {
		sibling = modify(memory, props, content);
		elm = memory;

		if (tag === 'script' || tag === 'style') {
			const { '': core } = memory;
			content = content.filter(it => typeof it === 'string').join('');
			if (content !== core[0]) core[0] = core[1].innerText = content;
		}
	} else if (params) {
		content = params;
	}

	if (Array.isArray(content)) reconcile(memory, content, elm, ctx, sibling);
	Object.assign(memory, props);
	return memory;
}
