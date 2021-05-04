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
	const custom = tag === '' && params;

	prev.splice(content.length);
	removals.delete(undefined);
	if (memory === ctx) ctx[''][1] = { '': state };

	for (let i = content.length - 1; i >= 0; i--) {
		const backup = prev[i];
		let it = content[i];

		if (typeof it === 'function') {
			it = items || custom ? it({ ...props, '': backup }) : it();
			const teardown = typeof it === 'function';

			if (!custom || teardown) {
				prev[i] = teardown ? it : undefined;
				continue;
			}
		} else if (custom && typeof it === 'string') {
			it = it === params[i] ? backup : parse(it);
		}

		if (!it && it !== 0 || it === true) {
			prev[i] = undefined;
			continue;
		} else if (Array.isArray(it)) {
			it = { '': [it, '', ''] };
		} else if (typeof it !== 'object') {
			it = { '': [it, ''] };
		}

		if (it instanceof Element || it instanceof Text) {
			it = prev[i] = it === backup[''][1] ? backup : { '': [, it] };
		} else {
			const { '': [, key] } = it;
			it = prev[i] = update(it, memory, i, refs, elm, ctx, sibling);
			if (key) ctx[''][1][key] = it;
		}

		let { '': [fragment, node, tag] } = it;

		if (fragment === '') {
			continue;
		} else if (typeof tag === 'function' || tag === '') {
			node = locate(fragment);
			if (tag === '') it[''][1] = node;
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
