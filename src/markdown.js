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
				links.add(node);
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
			wrapper = [type, null];
			indentation += length;
			props = { spaced: false, indentation, wrapper };
			container = [subtype || type, props];

			if (subtype) {
				nodes.push(wrapper);
			} else {
				wrapper.push(container);
			}

			nodes.push(container);
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
	const containers = new Set(stack);
	const links = new Set();
	const references = {};
	let newlines = 0;
	let ticks = 0;
	let locked = scopes.size > 0 && !scopes.has('');
	let alignments, reference;
	main[1].wrapper = ['', null, main];

	const regex = new RegExp(['^',
		'(\\s*(?::\\s{1,4})?(?:[>\s]+|(?:[-+*]|\\d+[.)])(?:\\s{1,4}|$))*\\s*)(?:',
			'(?:\\[\\s*(.*?)\\s*\\]:\\s+(<.*?>|[^<>]|[^<].*?[^>])(?:\\s+|$))?(\'.*?\'|".*?"|\\(.*?\\))?',
			'|(#{1,6})\\s+(.*?)(?:\\s+#+(\\S*))?',
			'|(=+|-+)',
			'|((?:\\*\\s+){3,}|(?:-\\s+){3,}|(?:_\\s+){3,})',
			'|(\\[[ xX-_]\\](?!\\S)|\\|(?!\\|.*?\\|\\|))?\\s*(.*?)',
		')',
	'\\s*$'].join(''));
	// eventually add HTML structure (starts with </?\w+>)
	// - should probably be handled inline with an HTML stack to open and close tags (empty space)
	// - only wrap in p tag if there is text that isn't wrapped in a tag

	for (const line of lines) {
		if (!/\S/.test(line)) {
			if (newlines) {
				stack.splice(1);
			}

			newlines += 1;
			continue;
		}

		let [,
			symbols, key, href, title,
			hashes, heading, id, underline,
			dashes, structure = '', string,
		] = line.match(regex);

		if (/^-{3,}|\*{3,}$/.test(symbols.trim())) {
			dashes = symbols;
			symbols = '';
		}

// 		console.log(`|${symbols}|${key}|${href}|${title}|
// |${hashes}|${heading}|${id}|${underline}|
// |${dashes}|${structure}|${string}|`);

		const oldlines = newlines;
		const nodes = parseNesting(symbols, stack, oldlines === 1);
		let container = stack[stack.length - 1];
		let previous = container[container.length - 1];
		let { padding } = stack[stack.length - 1][1];
		newlines = 0;

		if (key !== undefined) {
			if (!references[key]) {
				reference = { href: buildPath(rootNames, href) };
				references[key] = reference;
			}
		} else if (hashes) {
			locked = stack.length === 1 && scopes.size && !scopes.has(id);

			if (locked) {
				continue;
			}
			
			const node = [hashes.length, null];
			nodes.push(node);
			string = heading;
			
			if (id) {
				node[1] = { id };
				nodes.push(['a', { href: encodeURI(`${headingPath}#${id}`) }]);
			}
		} else if (locked) {
			continue;
		} else if (underline) {
			const type = underline[0] === '=' ? 1 : 2;

			if (!oldlines && previous?.[0] === '') {
				previous[0] = type;
				continue;
			} else if (type === 1) {
				string = underline;
			} else {
				dashes = underline;
			}
		} else if (padding !== undefined || ticks) {
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
		} else if (structure[0] === '[') {
			// TOOD: handlel checkbox here
			// - xX are checked, all rest are unchecked
		} else if (structure[0] === '|') {
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
		}

		if (title) {
			reference.title = title;
		} else if (underline || dashes) {
			nodes.push(['hr']);
		}

		for (const node of nodes) {
			container.push(node);
			container = node;

			if (node[1]?.spaced !== undefined) {
				containers.add(node);
				stack.push(node);
			}
		}

		if (container[0] !== 'tr') {
			alignments = undefined;
		}

		if (string) {
			const content = parseInline(string, rootNames, links);
			previous = container[container.length - 1];

			if (containers.has(container)) {
				if (oldlines || previous[0] !== '') {
					previous = ['', null];
					container.push(previous);
				} else {
					content.unshift(['br']); // TODO: only if previous line ended with two spaces
				}
				
				container = previous;
			}

			container.push(...content);
		}
	}

	for (const link of links) {
		const key = link[1];
		link[1] = { ...references[key] };
	}

	for (const container of containers) {
		const { spaced, wrapper } = container[1];

		for (const item of wrapper.slice(2)) {
			item[1] = null;

			for (let i = item.length - 1; i > 1; i--) {
				const child = item[i];

				if (child[0] !== '') {
					continue;
				} else if (spaced) {
					child[0] = 'p';
				} else {
					item.splice(i, 1, ...child.slice(2));
				}
			}
		}
	}

	return main;
}
