import { normalize, update } from '../memory';
import { forget } from './forget';
import { locate } from './locate';

export function reconcile (memory, content, elm, ctx, sibling) {
	const { '': core } = memory;
	let [prev = [],, tag, params] = core;
	const { '': [, container,, nodes] } = elm;
	const { '': [items, { '': state, ...refs }], ...props } = ctx;
	const removals = new Set(prev);
	const custom = tag === '' && params;

	prev.splice(content.length);
	removals.delete(undefined);
	if (memory === ctx) ctx[''][1] = { '': state };

	for (let i = content.length - 1; i >= 0; i--) {
		const backup = prev[i];
		let it = normalize(content[i], custom, i, backup, items && props);

		if (it instanceof Element || it instanceof Text) {
			const { '': [, node] = [] } = backup || {};
			it = it === node ? backup : { '': [, it] };
		} else if (typeof it === 'object' && Array.isArray(it[''])) {
			const { '': [, key] } = it;
			it = update(it, memory, i, refs, elm, ctx, sibling);
			if (key) ctx[''][1][key] = it;
		}

		prev[i] = it;
		if (typeof it !== 'object') continue;
		let { '': [fragment, node, tag] = [] } = it;

		if (typeof tag === 'function' || tag === '') {
			node = locate(fragment);
			if (tag === '') it[''][1] = node;
		} else if (fragment === '' || !node) {
			continue;
		} else if (!nodes && it !== backup) {
			if (sibling) container.insertBefore(node, sibling);
			else container.appendChild(node);
		}

		if (node) sibling = node;
		removals.delete(it);
	}

	if (tag === '' && params) core[3] = content;
	else if (nodes && elm === memory) core[3] = undefined;
	core[0] = prev;

	for (const memory of removals) {
		if (typeof memory !== 'function') forget(memory, elm);
	}
}
