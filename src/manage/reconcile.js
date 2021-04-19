import { update } from '../memory';
import { forget } from './forget';
import { locate } from './locate';

export function reconcile (memory, content, elm, ctx, sibling) {
	const { '': [prev,, tag] } = memory;
	const { '': [, container,, nodes] } = elm;
	const { '': [, { '': state, ...refs }], ...props } = ctx;
	const removals = new Set(prev);
	const backup = sibling;
	prev.splice(content.length);
	removals.delete(undefined);
	if (memory === ctx) ctx[''][1] = { '': state };

	for (let i = content.length - 1; i >= 0; i--) {
		const backup = prev[i];
		let it = content[i];
		if (typeof it === 'function') it = it({ ...props, '': backup });

		if (!it && it !== 0 || it === true || typeof it === 'function') {
			prev[i] = it && it !== true ? it : undefined;
			continue;
		} else if (Array.isArray(it) || typeof it !== 'object') {
			it = { '': [it, '', Array.isArray(it) ? '' : undefined] };
		}

		const { '': [, key] } = it;
		it = prev[i] = update(it, memory, i, refs, elm, ctx, sibling);
		if (key) ctx[''][1][key] = it;
		const { '': [fragment, node] } = it;

		if ((fragment || fragment === 0) && !nodes) {
			if (node instanceof Element || node instanceof Text) {
				if (it !== backup) {
					if (sibling) container.insertBefore(node, sibling);
					else container.appendChild(node);
				}

				sibling = node;
			} else {
				sibling = locate(fragment) || sibling;
			}
		}

		removals.delete(it);
	}

	if (tag === '') memory[''][1] = sibling !== backup ? sibling : undefined;
	else if (nodes && elm === memory) memory[''][3] = undefined;

	for (const memory of removals) {
		if (typeof memory !== 'function') forget(memory, elm);
	}
}
