import { client } from '../client';
import { forget } from './forget';
import { locate } from './locate';

export function reconcile (memory, elm, content, ctx, sibling, hydrating) {
	const { '': [prevContent] } = memory;
	const { '': [, container] } = elm;
	const removals = new Set(prevContent);
	removals.delete(undefined);

	for (let i = content.length - 1; i >= 0; i--) {
		let child = content[i];

		if (!child && child !== 0 || child === true) {
			prevContent[i] = undefined;
			continue;
		} else if (Array.isArray(child)) {
			child = client('', {}, ...child);
		} else if (typeof child !== 'function') {
			child = client(child);
		}

		const prev = prevContent[i];
		child = prevContent[i] = child(memory, elm, i, ctx, sibling, hydrating);
		const { '': [fragment, node] } = child;

		if ((fragment || fragment === 0) && !hydrating) {
			if (node instanceof Element || node instanceof Text) {
				if (child !== prev) {
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

	for (const memory of removals) forget(memory, elm);
}
