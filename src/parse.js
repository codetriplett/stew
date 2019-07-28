const independent = new RegExp([
	'^(wbr|track|source|param|meta|link|keygen|input',
	'|img|hr|embed|command|col|br|base|area|!doctype)$'
].join(''));

const openers = '<{"\'';
const closers = '>}"\'';

export function parse (markup) {
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

		if (!object || index && symbol && symbol !== '}') {
			let string = markup.slice(0, index).replace(/&[a-z]+;/, match => {
				switch (match) {
					case '&lang;':
						return '\u3008';
					case '&rang;':
						return '\u3009';
				}
			});

			switch (symbol) {
				case ' ':
				case '\t':
				case '\r':
				case '\n': {
					const index = string.indexOf('=');

					array = [];

					if (index === -1) {
						object[string] = true;
					} else {
						const value = string.slice(index + 1);
						object[string.slice(0, index)] = value || array;
					}
					
					break;
				}
				case '{': {
					const expression = string.split(':', 2);

					array.push(expression.map((value, i) => {
						value = value.trim();

						if (i) {
							if (!isNaN(value) && value) {
								return Number(value);
							} else if (value === 'true') {
								return true;
							} else if (value === 'false') {
								return false;
							}
						}

						return value;
					}));

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

		const { '': structure, ...attributes } = object || {};
		const definition = structure[0].flat().map(value => value.trim());
		let [tag] = definition;
		
		if (structure && /^\//.test(tag)) {
			break;
		} else if (!independent.test(tag)) {
			const children = parse(markup);

			markup = children.pop();

			if (children.length) {
				structure.push(...children);
			} else {
				structure.push([]);
			}
		}

		for (const key in attributes) {
			let array = object[key];
			
			if (key !== 'class') {
				if (array.length === 1 && typeof array[0] === 'string') {
					object[key] = array[0];
				}

				continue;
			}

			let conditional = false;

			array = array.map((item, i) => {
				if (typeof item !== 'string' || conditional) {
					conditional = Array.isArray(item) && item.length > 1;
					return item;
				}

				conditional = false;

				const classes = item.split(/ +/);
				const start = i > 0 ? 1 : 0;
				const finish = classes.length - (i < array.length - 1 ? 1 : 0);

				classes.splice(start, finish).forEach(item => {
					tag += `.${item}`;
				});

				return classes.join(' ').trim();
			}).filter(item => item);

			if (array.length) {
				object[key] = array;
			} else {
				delete object[key];
			}
		}

		structure[0] = [tag, ...definition.slice(1)].join(' ');
		array = [];
		result.push(array);
		object = undefined;
	}

	const first = result[0];
	const last = result[result.length - 1];
	const length = Array.isArray(last) && last.length - 1;

	if (Array.isArray(first) && typeof first[0] === 'string') {
		first[0] = first[0].replace(/^\s+/, '');
	}

	if (length !== false && typeof last[length] === 'string') {
		last[length] = last[length].replace(/\s+$/, '');
	}

	result = result.map((item, i) => {
		if (Array.isArray(item)) {
			item = item.map(value => {
				if (typeof value === 'string') {
					value = value.replace(/\s+/g, ' ');
				}

				return value;
			}).filter(value => value);

			if (!item.length) {
				return;
			}
		}

		return item;
	}).filter(item => item);

	return result.concat(markup);
}
