import { clean } from './clean';

const independent = new RegExp([
	'^(wbr|track|source|param|meta|link|keygen|input',
	'|img|hr|embed|command|col|br|base|area|!doctype)$'
].join(''));

const openers = '<{"\'';
const closers = '>}"\'';

export function parse (markup, children) {
	let array = [];
	let result = [array];
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

		if (!object || symbol && symbol !== '}') {
			const string = markup.slice(0, index);

			switch (symbol) {
				case ' ':
				case '\t':
				case '\r':
				case '\n': {
					const index = string.indexOf('=');

					array = [];

					if (index === -1) {
						object[string] = [true];
					} else {
						object[string.slice(0, index)] = array;
					}
					
					break;
				}
				case '{': {
					array.push([string]);
					break;
				}
				default:
					array.push(string);
					break;
			}
		}

		symbol = markup[index] !== symbol ? markup[index] : undefined;
		markup = markup.slice(index + 1);

		if (symbol !== '>') {
			if (symbol === '<') {
				array = [];
				object = { '': [array] };

				if (markup[0] !== '/') {
					result.push(object);
				}
			}

			continue;
		}

		const { '': structure } = object || {};

		const [tag, ...scope] = structure[0].map(value => {
			return typeof value === 'string' ? value.trim() : value;
		});
		
		if (structure && /^\//.test(tag)) {
			break;
		} else if (!independent.test(tag)) {
			const children = [];

			markup = parse(markup, children);

			if (children.length) {
				structure.push(...children);
			} else {
				structure.push('');
			}
		}

		structure.splice(0, 1, ...scope, tag);
		array = [];
		result.push(array);
		object = undefined;
	}

	result = clean(result).flat();

	if (children) {
		children.push(...result);
	}

	return children ? markup : result[0];
}
