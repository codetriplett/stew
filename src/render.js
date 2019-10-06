import { fetch } from './fetch';
import { locate } from './locate';
import { evaluate } from './evaluate';

export function render (state, view, name, node) {
	const generate = typeof node === 'string';

	if (Array.isArray(view)) {
		if (view.length < 2 && !view[0]) {
			return;
		}

		node = !generate ? locate(node, '') : undefined;
		return evaluate(view, state, node);
	}

	const hydrate = !generate && !state['.'][0][''];
	let { '': [tag, ...children], key = [['.']], ...attributes } = view;
	let count = hydrate ? locate(node, name) : undefined;

	if (Array.isArray(tag)) {
		const scope = fetch(tag[0], state, count);
		tag = children.shift();

		if (scope === null || scope === false) {
			state = undefined;
		} else if (scope !== true) {
			state = scope;
		}
	} else {
		name = undefined;
	}
	
	if (count === undefined) {
		if (!state || Array.isArray(state)) {
			count = state ? state.length : 0;
		}

		node = locate(node, tag, name, count);
	}

	if (state === undefined || node === undefined) {
		return generate ? '' : undefined;
	} else if (!Array.isArray(state)) {
		state = [state];
	}

	if (generate) {
		return state.map((state, i) => {
			let instance = node[i];

			for (const name in attributes) {
				instance = evaluate(attributes[name], state, name, instance);
			}

			if (!children.length) {
				return instance;
			}

			return `${instance}${children.map((child, i) => {
				return render(state, child, i, '');
			}).join('')}</${tag}>`;
		}).join('');
	}

	return state.reduceRight((node, state, i) => {
		if (count && i < count - 1) {
			node = node.previousSibling;
		}

		for (const name in attributes) {
			evaluate(attributes[name], state, name, node);
		}

		const lastChild = { parentElement: node, tagName: false };

		children.reduceRight((node, child, i) => {
			let candidate = node;

			if (candidate && i < children.length - 1) {
				candidate = candidate.previousSibling;
			}

			if (!candidate) {
				candidate = { ...lastChild, nextSibling: node };
			}

			return render(state, child, i, candidate) || candidate;
		}, node.lastChild);

		return node;
	}, node);
}
