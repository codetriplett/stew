import { fetch } from './fetch';
import { locate } from './locate';
import { evaluate } from './evaluate';
import { clean } from './clean';

export function render (state, view, name, node) {
	const root = name === '' || name === undefined;
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
	const conditional = Array.isArray(tag);
	let ignore = false;
	let count;
	let data;

	if (root) {
		data = tag;
		tag = children.shift();
	}
	
	if (hydrate) {
		count = locate(node, conditional ? name : undefined);

		if (typeof count !== 'number') {
			return;
		}
	}

	if (conditional) {
		const scope = fetch(tag[0], state, count);
		tag = children.shift();

		if (scope === null || scope === false || scope === undefined) {
			ignore = true;
			
			if (!generate) {
				state = undefined;
			}
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
		node = state.map((state, i) => {
			let instance = node[i];
			let content = '';
			
			for (const name in attributes) {
				instance = evaluate(attributes[name], state, name, instance);
			}

			if (children.length) {
				content = `${children.map((child, i) => {
					return render(state, child, i, '');
				}).join('')}</${tag}>`;
			}

			if (data) {
				const backup = clean(state['.'][0]);

				if (backup) {
					data += ` ${JSON.stringify(backup).replace(/'/g, '&#39;')}`;
				}

				instance = instance.replace(/.*?(?= |>)/, match => {
					return `${match} data--='${data}'`;
				});
			}

			return `${instance}${content}`;
		}).join('');

		return !ignore ? node : '';
	}

	return state.reduceRight((node, state, i) => {
		if (count && i < count - 1) {
			node = node.previousSibling;
		}

		for (const name in attributes) {
			evaluate(attributes[name], state, name, node);
		}

		const lastChild = { parentElement: node, tagName: false };
		let started = false;

		children.reduceRight((node, child, i) => {
			const { previousSibling } = node || {};
			let candidate = node;

			if (candidate && started) {
				candidate = previousSibling;
			}

			if (!candidate) {
				candidate = { ...lastChild, nextSibling: node };
			}

			candidate = render(state, child, i, candidate);
			started = started || !!candidate;

			if (candidate) {
				return candidate;
			}
			
			return node && node.parentElement ? node : previousSibling;
		}, node.lastChild);

		return node;
	}, node);
}
