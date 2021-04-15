import { update } from '../memory';
import { forget } from './forget';
import { locate } from './locate';

export function reconcile (memory, content, elm, ctx, sibling) {
	if (!Array.isArray(content)) return;
	const { '': [prev] } = memory;
	const { '': [, container,, nodes] } = elm;
	const removals = new Set(prev);
	prev.splice(content.length);
	removals.delete(undefined);

	for (let i = content.length - 1; i >= 0; i--) {
		let child = content[i];

		if (!child && child !== 0 || child === true) {
			prev[i] = undefined;
			continue;
		} else if (typeof child === 'function') {
			const { '': core, ...props } = ctx || {};
			child = child(props);
			prev[i] = typeof child === 'function' ? child : undefined;
			continue;
		} else if (Array.isArray(child) || typeof child !== 'object') {
			child = { '': [child, '', Array.isArray(child) ? '' : undefined] };
		}

		const backup = prev[i];
		child = prev[i] = update(child, memory, i, elm, ctx, sibling);
		const { '': [fragment, node] } = child;

		if ((fragment || fragment === 0) && !nodes) {
			if (node instanceof Element || node instanceof Text) {
				if (child !== backup) {
					if (sibling) container.insertBefore(node, sibling);
					else container.appendChild(node);
				}

				sibling = node;
			} else {
				sibling = locate(fragment) || sibling;
			}
		}

		removals.delete(child);
	}

	if (nodes && elm === memory) memory[''][3] = undefined;
	for (const memory of removals) forget(memory, elm);
}
