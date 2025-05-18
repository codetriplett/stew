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
	let locked = scopes.size && !scopes.has('');
	let alignments;

	for (const line of lines) {
		const [, key, href, title, hashes, heading, id, underline, padding, remainder] = line.match(/^(?:(?:\s{0,3}(?:\[\s*(.*?)\s*\]:\s+(\S+?)\s*(?:\s('.*?'|".*?"|\(.*?\)))?|(#{1,6})\s+(.*?)(?:\s+#+(\S*))?|(=+|-+)))|(\s*)(.*?))\s*$/);
		const oldlines = newlines;
		const nodes = [];
		let [, container] = stack[0];
		let whitespace = 0;
		let entry, dashes, symbols, structure, string;
		newlines = 0;

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
		} else if (!remainder) {
			if (oldlines) {
				stack.splice(1);
			}

			newlines = oldlines + 1;
			continue;
		} else if (locked) {
			continue;
		} else if (underline) {
			const previous = container[container.length - 1];

			if (previous?.[0] === 'p') {
				const type = underline[0] === '=' ? 1 : 2;
				const index = previous.findIndex(node => node[0] === 'br');
				locked = scoped.size > 0;

				if (index === -1) {
					previous[0] = type;
					continue;
				}

				const content = previous.splice(index);
				nodes.push([type, null, ...content.slice(1)]);
			}
		} else {
			whitespace = `${padding}`.replace('\t', '    ').length;

			for (const [i, candidate] of stack.entries()) {
				const [indentation, node] = candidate;
				entry = candidate;

				if (whitespace < indentation) {
					stack.splice(i);
					break;
				}

				whitespace -= indentation;
				container = node;
			}
		}

		let previous = container[container.length - 1];

		if (whitespace > 3 || ticks) {
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
		} else if (/^ {0,3}(`{3,})/.test(line)) {
			ticks = line.match(/^ {0,3}(`+)/)?.[1]?.length;
			nodes.push(['pre', null], ['code', null, '']);
		} else if (!nodes.length) {
			[, dashes, symbols, structure, string] = remainder.match(/^(?:((?:\*\s+){3,}|(?:-\s+)|(?:_\s+))\s*$|((?:(?:(?:[-+*:>]|\d+[.)])(?: {1,4}|\s*$))*)(?![\s-]+$))?(\[[ xX-_]\](?=\s)|\|(?!\|.*?\|\|))?\s*(.*?)\s*)$/);

			if (dashes) {
				nodes.push(['hr']);
			} else if (!symbols && !structure) {
				if (/^[uod]l$/.test(previous?.[0])) {
					container = previous[previous.length - 1];

					if (!oldlines) {
						container.push(['br']);
					}
				} else if (!oldlines && previous?.[0] === 'p') {
					container = previous;
					container.push(['br']);
				} else {
					nodes.push(['p', null]);
				}
			}
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

		let indentation = padding?.length || 0;
		symbols = symbols ? symbols.split(/\s(?=\S)/) : [];
		// TODO: fix nesting
		// - reverse makes sense since things that contain other unshift
		// - maybe the issue is how stack pushes, maybe split to currentn index

		for (const symbol of symbols) {
			if (symbol[0] === '>') {
				// TODO: process blockquote
				continue;
			}

			const item = ['li', null];
			let type = 'ol';
			indentation += symbol.length + 1;

			switch (symbol[0]) {
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

			if (!nodes.length) {
				spaceable.add(item);
			}

			if (oldlines > 1 || previous?.[0] !== type) {
				const start = type === 'ol' ? symbol.trim().slice(0, -1) : '1';
				const list = [type, start === '1' ? null : { start }];

				if (spaceable.has(previous)) {
					entry.splice(3);
				}

				if (type === 'dl' && previous?.[0] === 'p') {
					const term = container.pop();
					term[0] = 'dt';
					list.push(term);
				}

				stack.push([indentation, item, list, false]);
				nodes.push(list, item);
				spaceable.add(list);
				previous = undefined;
			} else {
				container = previous;
				entry.splice(0, 2, indentation, item);
				nodes.push(item);
				
				if ((oldlines || entry[3]) && spaceable.has(item)) {
					nodes.push(['p', null]);
				}
			}
		}

		// this should act on prev entry if new list is created, or current one
		if (oldlines === 1 && entry[3] === false) {
			const wrapper = entry[2];
			entry[3] = true;

			for (const item of wrapper.slice(2)) {
				if (spaceable.has(item)) {
					const content = item.splice(2);
					item.push(['p', null, ...content]);
				}
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
			container.push(...content);
		}
	}

	for (const link of links) {
		const key = link[1];
		link[1] = { ...references[key] };
	}

	return stack[0][1];
}
