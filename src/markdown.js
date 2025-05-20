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

export default function parse (content, rootPath = '') {
	if (!content) {
		return;
	}

	const [, trimmedPath, hash] = rootPath.match(/^\/?(.*?)\/?(?:#+(.*))?$/);
	const scopes = new Set(hash?.split?.(/#+/) || []); // check if hash units are used, e.g. #123abc is really the #abc hash but with a variation value of 123
	const headingPath = scopes.size ? `/${trimmedPath}` : '';
	const rootNames = trimmedPath ? trimmedPath.split('/') : [];
	const lines = content.split(/\r\n|\r|\n/);
	const stack = [[0, ['main', null]]];
	const spaceable = new Set();
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
			'|(\\s*(?:(?:[-+*:>]|\\d+[.)])(?:\\s|^))*\\s*)(?:',
				'((?:\\*\\s+){3,}|(?:-\\s+){3,}|(?:_\\s+){3,})',
				'|(\\[[ xX-_]\\](?=\\s)|\\|(?!\\|.*?\\|\\|))?\\s*(.*?)\\s*',
			')',
		')',
	'\s*$'].join(''));

	for (const line of lines) {
		const oldlines = newlines;
		const nodes = [];
		let [entry] = stack;
		let [, container] = entry;
		let previous = container[container.length - 1];
		let whitespace = 0;
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
		
		// this will move into the symbols loop since the rules work the same in blockquote block as they do at the main level
		// else if (!oldlines && !symbols && /^(p|[uod]l)$/.test(previous?.[0])) {
		// 	// markdowns lazy method of setting br content for last item, regardless of indentation
		// 	[, container] = stack[stack.length - 1];
		// 	string = line.slice(padding.length);
		// 	symbols = undefined;
		// 	structure = undefined;
		// } else {
		// 	whitespace = `${padding || ''}`.replace('\t', '    ').length;

		// 	for (const [i, candidate] of stack.entries()) {
		// 		const [indentation, node] = candidate;
		// 		entry = candidate;

		// 		if (whitespace < indentation) {
		// 			stack.splice(i);
		// 			break;
		// 		}

		// 		whitespace -= indentation;
		// 		container = node;
		// 	}
		// }

		previous = container[container.length - 1];

		if (underline?.length === 1) {
			symbols = underline;
			underline = undefined;
		} else if (underline?.length === 2) {
			string = underline;
			underline = undefined;
		}

		let indentation = 0;
		let fillCount = 0;
		let stackIndex;
		
		if (symbols) {
			symbols = symbols.replace(/\S$/, m => `${m} `).replace(/\t/g, (m, index) => {
				index += fillCount;
				const count = 4 - (index % 4);
				fillCount += count - 1;
				return Array(count).fill(' ').join('');
			}).split(/\s(?=\S|$)/).slice(0, -1);

			stackIndex = 1;
			entry = stack[1];
		}
		
		let prevEntry = entry;

		for (let symbol of symbols) {
			const item = ['li', null];
			let type = 'ol';
			indentation += symbol.length + 1;
			symbol = symbol.trim();

			switch (symbol) {
				case '': case '>': {
					while (stackIndex < stack.length) {
						stackIndex++;

						if (entry[0] < indentation) {
							stack.splice(stackIndex);
							break;
						}
						
						container = entry[1];
						entry = stack[stackIndex];
					}

					type = 'blockquote';
					item[0] = 'p';
					break;
				}
				case '-': case '+': case '*': {
					type = 'ul';
					break;
				}
				case ':': {
					type = 'dl';
					item[0] = 'dd';
					break;
				}
			}

			if (!symbol) {
				continue;
			}

			if (!nodes.length) {
				spaceable.add(item);
			}
			
			const list = entry?.[2];
			nodes.push(item);

			// TODO: handle blockquote properly
			// - it doesn't seem to be recognizing adjacent lines as part of same set (maybe indentation processing?)
			if (oldlines > 1 || list?.[0] !== type) {
				const start = type === 'ol' ? symbol.slice(0, -1) : '1';
				const list = [type, start === '1' ? null : { start }];

				if (spaceable.has(previous) && prevEntry && entry === prevEntry) {
					prevEntry.splice(3);
				}

				if (type === 'dl' && previous?.[0] === 'p') {
					const term = container.pop();
					term[0] = 'dt';
					list.push(term);
				}

				stack.push([indentation, item, list, false]);
				nodes.splice(-1, 0, list);
				spaceable.add(list);
			} else if (type !== 'blockquote') {
				container = previous;
				entry.splice(0, 2, indentation, item);
				
				if ((oldlines || entry[3]) && spaceable.has(item)) {
					nodes.push(['p', null]);
				}
			}
		}

		// this should act on prev entry if new list is created, or current one
		if (oldlines === 1 && prevEntry?.[3] === false) {
			const wrapper = prevEntry[2];
			prevEntry[3] = true;

			for (const item of wrapper.slice(2)) {
				if (spaceable.has(item)) {
					const content = item.splice(2);
					item.push(['p', null, ...content]);
				}
			}
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

		if ((indentation - stack[stack.length - 1][0]) > 3 || ticks) {
			if (ticks && line.match(/^ {0,3}(`+)[ \t]*$/)?.[1]?.length >= ticks) {
				ticks = 0;
				continue;
			}

			const indentation = ticks ? 0 : line[0] === '\t' ? 1 : 4;
			const text = line.slice(indentation);

			if (previous?.[0] === 'pre') {
				const newlines = oldlines + (previous[2][2] ? 1 : 0);
				previous[2][2] += `${Array(newlines).fill('\n').join('')}${text}`;
				continue;
			}

			nodes.push(['pre', null], ['code', null, text]);
			string = '';
		} else if (/^`{3,}/.test(string)) {
			ticks = string.search(/[^`]|$/);
			nodes.push(['pre', null], ['code', null, '']);
			string = '';
		}

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

	return stack[0][1];
}
