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

// most of the code can remain the same, key changes...
// - only store containers in stack (main, li, dd, blockquote, etc)
// - store indentation and spaced props on containter props object (main defaults to spaced)
// - have li and dd also store a list prop that points to that node so we can check its tagName and add children to it
// - fragments will be used as child of containers if other type isn't detected (ul, ol, dl, blockquote, table, etc)
// - include br to existing fragment if new line is also a fragment before adding the content
// - on final pass, if container has been marked as spaced, change '' in fragments to 'p'
// - things that borrow (underlined headlines, definition term, etc) will take the whole previous fragment if there is no newline
//   - not only is this easier to manage, since we don't need to extract according to 'br', it also allows these elements to have br's themselves
// - this should clean up quite a bit of code
function parseNesting (string, stack, isSpaceable) {
	const nodes = [];
	let [container] = stack;
	let props = container[1];
	let depth = 0;
	let fillCount = 0;
	let indentation = 0;
	let padding, symbol, wrapper;

	string = string.replace(/\t/g, (m, index) => {
		index += fillCount;
		const count = 4 - (index % 4);
		fillCount += count - 1;
		return Array(count).fill(' ').join('');
	}).replace(/\S$/, m => `${m} `).replace(/>\s+(?=>)/g, '>');

	while (string) {
		[, padding, symbol, string] = string.match(/^(\s*)((?:>+|\S*)\s*)(.*)$/);
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
				depth += symbol.trim().length;
				indentation = 0;

				if (isSpaceable) {
					depth = 1;
					stack.splice(1);
				}

				break;
			}
		}

		if (subtype) {
			indentation += padding.length;
			depth = stack.findIndex((entry, i) => i > depth && indentation < entry?.[1]?.indentation);

			if (depth === -1) {
				depth = stack.length;
			}
		}

		const { length } = symbol;
		container = stack[depth];
		props = container?.[1];
		({ wrapper } = props || {});

		if (type !== wrapper?.[0]) {
			wrapper = subtype && [type, null];
			indentation += length;
			props = { spaced: false, indentation, wrapper };
			container = [subtype || type, props];
			nodes.push(wrapper, container);
			stack.splice(depth);

			if (type === 'ol') {
				const start = symbol.trim().slice(0, -1);

				if (start !== '1') {
					wrapper[1] = { start };
				}
			} else if (subtype === 'dd') {
				const previous = stack[depth - 1];
				let term;

				if (previous[previous.length - 1]?.[0] === '') {
					term = previous.pop();
					term[0] = 'dt';
				} else {
					term = ['dt', null];
				}

				wrapper.push(term);
			}
		} else if (subtype) {
			wrapper.splice(-1, 0, [...container.slice(0, 2), ...container.splice(2)]);
			props.indentation += length;
		}
	}

	if (isSpaceable) {
		stack[stack.length - 1][1].spaced = true;
	}

	padding = symbol ? symbol.replace(/\S+\s/, '') : padding || '';

	if (padding.length > 3) {
		props.padding = padding.slice(4);
		
		if (depth) {
			props.indentation -= 4;
		}
	} else {
		props.padding = undefined;
	}

	return nodes;
}

export function finalize (node, references) {
	if (!Array.isArray(node)) {
		return;
	}

	let [, props, ...children] = node;
	const { start, spaced, wrapper } = props || {};

	if (typeof props === 'string') {
		node[1] = { ...references[props] };
	} else if (props && !start) {
		node[1] = null;
	}

	for (let i = children.length - 1; i >= 0; i--) {
		const child = children[i];
		finalize(child, references);

		if (child[0] === '') {
			if (spaced) {
				child[0] = 'p';
			} else if (wrapper) {
				node.splice(i + 2, 1, ...child.slice(2));
			}
		}
	}
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
	const main = ['main', { spaced: true }];
	const stack = [main];
	// const spaceable = new Set();
	// const spaced = new Set();
	const references = {};
	const links = [];
	let newlines = 0;
	let ticks = 0;
	let locked = scopes.size > 0 && !scopes.has('');
	let alignments;

	const regex = new RegExp(['^',
		'(?:',
			// move these to after nesting
			// - have scope lock based only on headings at the root (when symbols is empty, and newlines are present)
			// - checkboxes can exist in headings and tables
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
			'|(\\s*(?::\\s{1,4})?(?:[>\s]+|(?:[-+*]|\\d+[.)])(?:\\s{1,4}(?=\\S|^)|^))*\\s*)(?:',
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

		const wrappers = parseNesting(symbols, stack, oldlines === 1);
		container = stack[stack.length - 1];
		previous = container[container.length - 1];
		nodes.unshift(...wrappers);
		stack.push(...wrappers.filter(node => node[1]?.spaced === false));
		let { padding } = stack[stack.length - 1][1];

		if (padding !== undefined || ticks) {
			string = `${padding || ''}${dashes || ''}${structure || ''}${string}`;

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

		// console.log(stack[stack.length - 1][1]);
		
		// second pass will use tagName '' to know if they can be wrapped in 'p'
		// if (nodes.length === wrappers.length) {
		// 	spaceable.add(wrappers[wrappers.length - 1]);
		// }

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

		for (const node of nodes) {
			container.push(node);
			container = node;
		}

		if (container[0] !== 'tr') {
			alignments = undefined;
		}

		if (string) {
			const content = parseInline(string, rootNames, links);
			previous = container[container.length - 1];

			if (nodes.length <= wrappers.length) {
				if (!oldlines && previous[0] === '') {
					content.unshift(['br']);
				} else {
					previous = ['', null];
					container.push(previous);
				}
				
				container = previous;
			}

			container.push(...content);
		}
	}

	// for (const link of links) {
	// 	const key = link[1];
	// 	link[1] = { ...references[key] };
	// }

	// for (const list of spaced) {
	// 	for (const item of list.slice(2)) {
	// 		const content = item.splice(2);
	// 		item.push(['p', null, ...content]);
	// 	}
	// }

	finalize(main);
	return main;
}
