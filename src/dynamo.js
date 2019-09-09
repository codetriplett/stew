import { evaluate } from './evaluate';
import { render } from './render';

export function dynamo ([item, ...items], state, ...parameters) {
	const dynamic = typeof item === 'object';
	const advancement = [...parameters];
	let [index, node] = parameters;
	let resolve = evaluate;
	let skip = false;

	if (typeof index === 'number') {
		if (node && typeof node.getAttribute === 'function') {
			const { parentElement } = node;
			const regex = new RegExp(`^${index}(-|$)`);
			const nodes = [];

			while (index !== null && node) {
				index = node.getAttribute('data--');

				if (index && !regex.test(index) || !index && nodes.length) {
					break;
				}

				nodes.push(node);
				node = node.nextSibling;
			}

			advancement[1] = node;
			parameters[1] = nodes;
		}

		advancement[0]++;
		resolve = render;
	} else if (dynamic) {
		skip = item.length > 1;
	} else if (Array.isArray(index)) {
		index.push(item);
	}

	if (items.length) {
		items = dynamo(items, state, ...advancement);
	}

	if (items) {
		if (dynamic) {
			if (skip) {
				update = items[0];
				skip = !update;
			}

			item = skip || resolve(item, state, ...parameters);
		}

		if (typeof item !== 'boolean') {
			items.unshift(item);
		} else if (!item) {
			if (!items.length) {
				return false;
			}

			items[0] = '';
		}
	}

	return items;
}
