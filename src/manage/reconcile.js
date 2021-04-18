import { update } from '../memory';
import { forget } from './forget';
import { locate } from './locate';

export function reconcile (memory, content, elm, ctx, sibling) {
	const { '': [prev,, tag] } = memory;
	const { '': [, container,, nodes] } = elm;
	const removals = new Set(prev);
	const backup = sibling;
	prev.splice(content.length);
	removals.delete(undefined);

	for (let i = content.length - 1; i >= 0; i--) {
		let it = content[i];

		if (typeof it === 'function') {
			const { '': [, { '': state } = {}] = [], ...props } = ctx || {};
			it = it({ ...props, '': state });
		}

		if (!it && it !== 0 || it === true || typeof it === 'function') {
			prev[i] = it && it !== true ? it : undefined;
			continue;
		} else if (Array.isArray(it) || typeof it !== 'object') {
			it = { '': [it, '', Array.isArray(it) ? '' : undefined] };
		}

		const backup = prev[i];
		it = prev[i] = update(it, memory, i, elm, ctx, sibling);
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
	for (const memory of removals) forget(memory, elm);
}
