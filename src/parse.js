import { normalize } from './normalize';

const independent = new RegExp([
	'^(wbr|track|source|param|meta|link|keygen|input',
	'|img|hr|embed|command|col|br|base|area|!doctype)$'
].join(''));

const openers = '<{"\'';
const closers = '>}"\'';

export function parse (markup) {
	let array = [];
	const result = [array];
	let object;
	let symbol;

	while (markup) {
		let pattern;

		if (openers.indexOf(symbol) > 0) {
			pattern = `\\${closers[openers.indexOf(symbol)]}`;
		} else if (object) {
			pattern = `[${closers[0]}${openers.slice(1)}]|\\s[a-z]`;
		} else {
			pattern = `[${openers.slice(0, 2)}]`;
		}

		const index = markup.search(new RegExp(`${pattern}|$`));

		if (index || !object) {
			const string = markup.slice(0, index);

			if (symbol === ' ') {
				const index = string.indexOf('=');

				array = [];

				if (index === -1) {
					object[string] = true;
				} else {
					const value = string.slice(index + 1);
					object[string.slice(0, index)] = value || array;
				}
			} else {
				const dynamic = symbol === '{';
				const odd = array.length % 2;
				
				if (dynamic && !odd) {
					array.push('');
				} else if (!dynamic && odd) {
					array = [];
				}

				array.push(string);
			}
		}

		symbol = markup[index] !== symbol ? markup[index] : undefined;
		markup = markup.slice(index + 1);

		if (symbol !== '>') {
			if (symbol === '<') {
				array = [];
				object = { '': array };

				if (markup[0] !== '/') {
					result.push(object);
				}
			}

			continue;
		}

		const { '': structure } = object || {};
		const [tag] = structure;
		
		if (structure && /^\//.test(tag)) {
			break;
		} else if (!independent.test(tag)) {
			const children = parse(markup);

			if (structure.length < 2) {
				structure.push('');
			}

			markup = children.pop();
			structure.push(children);
		}

		array = [];
		object = undefined;
		result.push(array);
	}

	return result.map(normalize).filter(item => item).concat(markup);
}
