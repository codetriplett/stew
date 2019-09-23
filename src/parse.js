const independent = new RegExp([
	'^(wbr|track|source|param|meta|link|keygen|input',
	'|img|hr|embed|command|col|br|base|area|!doctype)$'
].join(''));

const newlines = /^\s+|[\n\r\t]+|\s+$/g;
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
					const values = string.split(/\s+/, 2);
					const comparison = values[1];

					if (comparison && !isNaN(comparison)) {
						values[1] = Number(comparison);
					} else if (comparison === 'true') {
						values[1] = true;
					} else if (comparison === 'false') {
						values[1] = false;
					}

					array.push(values);
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
				structure.push(['']);
			}
		}

		structure.splice(0, 1, tag);

		if (scope.length) {
			structure.unshift(scope);
		}

		array = [];
		result.push(array);
		object = undefined;
	}

	result = result.map(item => {
		if (!Array.isArray(item)) {
			if (typeof item === 'object') {
				Object.keys(item).forEach(key => {
					!item[key].length && delete item[key];
				});
			}

			return item;
		}

		item = item.map((value, i) => {
			if (typeof value !== 'string') {
				return value;
			}

			const ends = new RegExp([
				!i ? '^\\s+' : '',
				i === item.length - 1 ? '\\s+$' : ''
			].filter(item => item).join('|'), 'g');

			return value.replace(ends, '').replace(/\s+/g, ' ');
		}).filter(value => value);

		if (item.length) {
			return item;
		}
	}).filter(item => item);

	if (children) {
		children.push(...result);
	}

	return children ? markup : result[0];
}
