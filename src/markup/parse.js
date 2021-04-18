import { singletons } from './scribe';

const cache = new WeakMap();

export function parse (strings, ...variables) {
	const outline = {};

	if (!variables.length) {
		if (cache.has(strings)) return cache.get(strings);
		cache.set(strings, outline);
	}

	let text = '', content = [], memory;
	const symbol = '<';
	const stack = [content];

	for (let string of strings) {
		while (string.length) {
			const index = string.indexOf(symbol);

			if (~index) {
				if (symbol === '<') {
					text += string.slice(0, index);
					if (text) content.push({ '': [text] });
					symbol = '>';
					stack.unshift(content = []);
				} else {
					
				}
			} else {
				const variable = variables.shift();
			}
		}
	}

	if (!variables)
	return outline;
}
