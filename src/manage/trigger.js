import { transform } from '../memory';
import { locate } from './locate';
import { reconcile } from './reconcile';

export const registry = new Map();
const queue = [];

export function trigger (memory, elm, state, depth = -1) {
	if (depth < 0) state = memory[''][1][''];
	if (state) return trigger(memory, elm, state(''), depth + 1);

	let map = queue[depth];
	state = memory[''][1][''];
	
	if (!queue.length) {
		setTimeout(() => {
			while (queue.length) {
				map = queue.shift();
				if (!map) continue;
				for (const callback of map.values()) callback();
				map.clear();
			}

			registry.clear();
		}, 0);
	}

	if (registry.has(state)) return;
	else if (!map) map = queue[depth] = new Map();
	registry.set(state, map);

	map.set(state, () => {
		const content = transform(memory);
		const { '': [children] } = elm;
		const index = children.indexOf(memory);
		const sibling = ~index ? locate(children.slice(index + 1)) : undefined;

		reconcile(memory, elm, content, memory, sibling);
	});
}
