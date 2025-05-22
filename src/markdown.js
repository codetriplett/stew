function buildPath (rootNames, href = '') {
	if (!href.startsWith('.')) {
		return href;
	} else if (href === '.') {
		href = './index';
	}

	const sections = href.replace(/^.\//, '').split('/');
	const sourcePath = rootNames.slice(0, -1);

	while (sections[0] === '..') {
		sections.shift();
		sourcePath.pop();
	}

	sourcePath.push(...sections);
	return `/${sourcePath.join('/')}`;
}

export function parseInline (string, rootNames, links) {
	// TODO: process expressions in text (e.g. bold, strikethrough, ndash, etc)
	// - return array of children to spread onto parent element
	const content = [];

	while (string) {
		const spoilerMatch = string.match(/^\|\|(.*?)\|\|(.*)$/);

		if (spoilerMatch) {
			const [, spoiler, remainder] = spoilerMatch;

			content.push(['span', {
				onclick: {
					style: { color: 'transparent' },
				},
			}, spoiler]);

			string = remainder;
			continue;
		}

		const linkMatch = string.match(/^\[\s*(.*?)\s*\]\s*(?:\(\s*(.*?)\s*(?:['"](.*?)['"])?\s*\)|\[\s*(.*?)\s*\])(.*)$/);

		if (linkMatch) {
			const [, text, href, title, key, remainder] = linkMatch;
			const node = ['a', key, text];
			content.push(node);
			string = remainder;

			if (key) {
				links.push(node);
				continue;
			}

			const props = { href: buildPath(rootNames, href) };
			node[1] = props;

			if (title) {
				props.title = title;
			}

			continue;
		}

		content.push(string);
		break;
	}

	return content;
}

export function parseNesting (string, stack, spaced) {
	const nodes = [];
	let depth = 0;
	let fillCount = 0;
	let indentation = 0;
	let symbol, padding, root;

	string = string.replace(/\S$/, m => `${m} `).replace(/>\s+(?=>)/g, '>').replace(/\t/g, (m, index) => {
		index += fillCount;
		const count = 4 - (index % 4);
		fillCount += count - 1;
		return Array(count).fill(' ').join('');
	});

	while (string) {
		[, padding, symbol, string] = string.match(/^(\s*)(>+|\S*\s*)(.*)$/);
		const { length } = symbol;
		let type = 'ol';
		let subtype = 'li';

		if (!symbol) {
			break;
		}

		switch (symbol[0]) {
			case '-': case '+': case '*': {
				type = 'ul';
				break;
			}
			case ':': {
				type = 'dl';
				subtype = 'dd';
				break;
			}
			case '>': {
				type = 'blockquote';
				subtype = '';
				depth += length;
				indentation = 0;

				if (spaced) {
					depth = 1;
					stack.splice(1);
					spaced = undefined;
				}

				break;
			}
		}

		if (subtype) {
			indentation += padding.length;
			depth = stack.findIndex((entry, i) => i > depth && indentation < entry?.[1]);

			if (depth === -1) {
				depth = stack.length;
			}
		}

		if (stack[depth]?.[0]?.[0] !== type) {
			root ??= depth - 1;
			const start = type === 'ol' ? symbol.trim().slice(0, -1) : '1';
			const wrapper = [type, start === '1' ? null : { start }];
			stack.splice(depth, stack.length, [wrapper]);
			nodes.push(wrapper);
		}

		if (subtype) {
			const entry = stack[depth];
			const item = [subtype, null];
			nodes.push(item);
			indentation += length;
			entry[1] = indentation;
			
			if (spaced) {
				spaced.add(entry[0]);
				spaced = undefined;
			}
		}
		
		root ??= depth;
	}

	const container = stack[root ?? (spaced ? 0 : stack.length - 1)][0];
	return [container, ...nodes];
}

export default function parse (content, rootPath = '') {
	if (!content) {
		return;
	}

	const [, trimmedPath, hash] = rootPath.match(/^\/?(.*?)\/?(?:#+(.*))?$/);
	const scopes = new Set(hash?.split?.(/#+/) || []); // check if hash units are used, e.g. #123abc is really the #abc hash but with a variation value of 123
	const headingPath = scopes.size ? `/${trimmedPath}` : '';
	const rootNames = trimmedPath ? trimmedPath.split('/') : [];
	const lines = content.split(/\r\n|\r|\n/);
	const stack = [[['main', null]]];
	const spaceable = new Set();
	const spaced = new Set();
	const references = {};
	const links = [];
	let newlines = 0;
	let ticks = 0;
	let locked = scopes.size > 0 && !scopes.has('');
	let alignments;

	const regex = new RegExp(['^',
		'(?:',
			'(?:\\s{0,3}(?:',
				'\\[\\s*(.*?)\\s*\\]:\\s+(\\S+?)\\s*(?:\\s(\'.*?\'|".*?"|\\(.*?\\)))?',
				'|(#{1,6})\\s+(.*?)(?:\\s+#+(\\S*))?',
				'|(=+|-+)',
			'))',
			// TODO: test that - - - at end of symbol string is used as hr if at end of line
			// TODO: test that only up to 4 spaces are allowed after list symbols
			// TODO: include spaces in string so they can be added back if it needs to be preformatted
			// - need to know the index of the string capture group within line to know how many spaces a tab adds
			// - maybe add a capture group for padding before string, then add back the extra after the 4 leading spaces have been found
			'|(\\s*(?::\\s{1,4})?(?:[>\s]+|(?:[-+*]|\\d+[.)])(?:\\s{1,4}(?=\\S|^)|^))*)(?:',
				'((?:\\*\\s+){3,}|(?:-\\s+){3,}|(?:_\\s+){3,})', // these are only allowed at end of line (maybe add lookahead to make sure)
				'|(\\[[ xX-_]\\](?=\\s)|\\|(?!\\|.*?\\|\\|))?\\s*(.*?)\\s*',
			')',
		')',
	'\s*$'].join(''));

	for (const line of lines) {
		const oldlines = newlines;
		const nodes = [];
		let [container] = stack[0];
		let previous = container[container.length - 1];
		newlines = 0;

		let [,
			key, href, title,
			hashes, heading, id, underline,
			symbols = '', dashes, structure, string,
		] = line.match(regex);

// 		console.log(`|${key}|${href}|${title}|
// |${hashes}|${heading}|${id}|${underline}|
// |${symbols}|${dashes}|${structure}|${string}|`);

		if (key !== undefined && !references[key]) {
			const props = { href: buildPath(rootNames, href) };
			references[key] = props;
			
			if (title) {
				props.title = title;
			}

			continue;
		} if (hashes) {
			locked = scopes.size && !scopes.has(id);

			if (locked) {
				continue;
			}
			
			const node = [hashes.length, null];
			nodes.push(node);
			
			if (id) {
				node[1] = { id };
				nodes.push(['a', { href: encodeURI(`${headingPath}#${id}`) }]);
			}

			string = heading;
			stack.splice(1);
		} else if (locked) {
			continue;
		} else if (underline && !oldlines && previous?.[0] === 'p') {
			const type = underline[0] === '=' ? 1 : 2;
			const index = previous.findIndex(node => node?.[0] === 'br');
			locked = scopes.size > 0;

			if (index === -1) {
				previous[0] = type;
				continue;
			}

			const content = previous.splice(index);
			nodes.push([type, null, ...content.slice(1)]);
		} else if (line === symbols && !/\S/.test(symbols)) {
			if (oldlines) {
				stack.splice(1);
			}

			newlines = oldlines + 1;
			continue;
		}
		
		if (underline?.length === 1) {
			symbols = underline;
			underline = undefined;
		} else if (underline?.length === 2) {
			string = underline;
			underline = undefined;
		}

		const wrappers = parseNesting(symbols, stack, oldlines && spaced);
		container = wrappers.shift();
		previous = container[container.length - 1];
		nodes.unshift(...wrappers);
		
		if (nodes.length === wrappers.length) {
			spaceable.add(wrappers[wrappers.length - 1]);
		}

		// TODO: can dashes be part of structure capture group
		if (underline || dashes) {
			nodes.push(['hr']);
		}

		switch (structure?.[0]) {
			case '[': {
				// TOOD: handlel checkbox here
				// - xX are checked, all rest are unchecked
				break;
			}
			case '|': {
				const remainder = string.endsWith('|') ? string : `${string}|`;
				string = '';

				if (/^(\s*:?-+:?\s*\|)+$/.test(remainder)) {
					const isFirst = !alignments;
					container = previous?.[2];

					alignments = remainder.slice(0, -1).split(/\s*\|\s*/).map(string => {
						return string.endsWith(':') ? string.startsWith(':') ? 'center' : 'right' : '';
					});

					if (isFirst && container?.[0] === 'tbody' && oldlines === 0) {
						container[0] = 'thead';
						previous.push(['tbody', null]);

						for (const row of container.slice(2)) {
							for (const [i, cell] of row.slice(2).entries()) {
								const textAlign = alignments[i];
								cell[0] = 'th';

								if (textAlign) {
									cell[1] = { style: { textAlign } };
								}
							}
						}
					}

					continue;
				}

				if (previous?.[0] !== 'table' || oldlines > 0) {
					nodes.push(['table', null], ['tbody', null]);
				} else {
					container = previous[previous.length - 1];
				}

				nodes.push(['tr', null, ...remainder.slice(0, -1).split('|').map((text, i) => {
					const textAlign = alignments?.[i];
					const content = parseInline(text, rootNames, links);
					return ['td', textAlign ? { style: { textAlign } } : null, ...content];
				})]);

				break;
			}
		}

		// if ((indentation - stack[stack.length - 1][0]) > 3 || ticks) {
		// 	if (ticks && line.match(/^ {0,3}(`+)[ \t]*$/)?.[1]?.length >= ticks) {
		// 		ticks = 0;
		// 		continue;
		// 	}

		// 	const indentation = ticks ? 0 : line[0] === '\t' ? 1 : 4;
		// 	const text = line.slice(indentation);

		// 	if (previous?.[0] === 'pre') {
		// 		const newlines = oldlines + (previous[2][2] ? 1 : 0);
		// 		previous[2][2] += `${Array(newlines).fill('\n').join('')}${text}`;
		// 		continue;
		// 	}

		// 	nodes.push(['pre', null], ['code', null, text]);
		// 	string = '';
		// } else if (/^`{3,}/.test(string)) {
		// 	ticks = string.search(/[^`]|$/);
		// 	nodes.push(['pre', null], ['code', null, '']);
		// 	string = '';
		// }

		for (const node of nodes) {
			container.push(node);
			container = node;
		}

		if (container[0] !== 'tr') {
			alignments = undefined;
		}

		if (string) {
			const content = parseInline(string, rootNames, links);

			if (!nodes.length) {
				if (!oldlines && /^(li|dd)$/.test(container[0])) {
					container.push(['br']);
				} else if (!oldlines && previous?.[0] === 'p' && !structure?.[0] !== '|') {
					container = previous;
					container.push(['br']);
				} else {
					container.push(['p', null, ...content]);
					continue;
				}
			}

			container.push(...content);
		}
	}

	for (const link of links) {
		const key = link[1];
		link[1] = { ...references[key] };
	}

	for (const list of spaced) {
		for (const item of list.slice(2)) {
			const content = item.splice(2);
			item.push(['p', null, ...content]);
		}
	}

	return stack[0][0];
}
