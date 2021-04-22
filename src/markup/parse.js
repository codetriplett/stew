import { singletons } from './scribe';
import { format } from './format';

const cache = new WeakMap();

export function parse (strings, ...variables) {
	if (!variables.length && cache.has(strings)) return cache.get(strings);
	let inside = false, expression = [], content = [], fragment;
	const stack = [fragment = content];

	for (let string of [...strings, '<']) {
		const variable = variables.shift();

		while (true) {
			const index = string.indexOf(inside ? '>' : '<');

			expression.push(string
				.slice(0, ~index ? index : undefined)
				.replace(/^\s*[\n\r]\s*|\s*[\n\r]\s*$/g, '')
				.replace(/\s*[\n\r]\s*|\t/g, ' '));

			if (!~index) {
				expression.push(variable);
				break;
			} else if (inside) {
				const elm = format(expression);

				if (elm) {
					const { '': [array,, tag] } = elm;
					content.push(elm);
					if (!~singletons.indexOf(tag)) stack.push(content = array);
				} else {
					stack.pop();
					content = stack[stack.length - 1] || [];
				}
			} else {
				content.push(...expression.filter((it, i) => it || i % 2));
			}

			string = string.slice(index + 1);
			inside = !inside;
			expression = [];
		}
	}

	content.pop();
	if (!variables.length) cache.set(strings, fragment);
	return fragment;
}
