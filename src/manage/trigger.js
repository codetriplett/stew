import { transform } from '../memory';
import { locate } from './locate';
import { reconcile } from './reconcile';

export const queue = [];

export function trigger (memory, elm) {
	const { '': [, { '': { '': callback }, ...refs }] } = memory;
	const depth = callback();
	let map = queue[depth];

	if (!queue.length) {
		setTimeout(() => {
			while (queue.length) {
				if (!(map = queue.shift())) continue;
				for (const callback of map.values()) callback();
				map.clear();
			}
		}, 0);
	}

	if (!map) map = queue[depth] = new Map();
	else if (map.has(memory)) return;

	map.set(memory, () => {
		const content = transform(memory);
		const { '': [children] } = elm;
		const index = children.indexOf(memory);
		const sibling = ~index ? locate(children.slice(index + 1)) : undefined;

		reconcile(memory, content, refs, elm, memory, sibling);
	});
}
