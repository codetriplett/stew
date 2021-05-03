import { parse } from '../markup';
import { update } from '../memory';
import { forget } from './forget';
import { locate } from './locate';

export function reconcile (memory, content, elm, ctx, sibling) {
	const { '': core } = memory;
	let [prev = [],, tag, params] = core;
	const { '': [, container,, nodes] } = elm;
	const { '': [items, { '': state, ...refs }], ...props } = ctx;
	const removals = new Set(prev);
	const backup = sibling;
	prev.splice(content.length);
	removals.delete(undefined);
	if (memory === ctx) ctx[''][1] = { '': state };

	for (let i = content.length - 1; i >= 0; i--) {
		const backup = prev[i];
		let it = content[i];
		if (params && typeof it === 'string' && it !== backup) it = parse(it);

		if (typeof it === 'function') {
			it = items ? it({ ...props, '': backup }) : it();
			prev[i] = typeof it === 'function' ? it : undefined;
			continue;
		} else if (!it && it !== 0 || it === true) {
			prev[i] = undefined;
			continue;
		} else if (Array.isArray(it) || typeof it !== 'object') {
			it = { '': [it, '', Array.isArray(it) ? '' : undefined] };
		}

		const { '': [, key] } = it;
		it = prev[i] = update(it, memory, i, refs, elm, ctx, sibling);
		if (key) ctx[''][1][key] = it;
		let { '': [fragment, node, tag] } = it;
		const elemental = typeof tag !== 'function' && tag !== '';

		if (fragment === '') {
			continue;
		} else if (!nodes && elemental && it !== backup) {
			if (sibling) container.insertBefore(node, sibling);
			else container.appendChild(node);
		}

		if (!elemental) {
			node = locate(fragment);
			if (tag === '') it[''][1] = node;
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
