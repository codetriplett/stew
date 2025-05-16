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
			const node = ['a',, text];
			content.push(node);
			string = remainder;

			if (key) {
				node[1] = key;
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
	const stack = [[0, ['main', {}]]];
	const inlines = new Set();
	const references = {};
	const links = [];
	let newlines = 0;
	let ticks = 0;
	let spaced = false;
	let locked = scopes.size && !scopes.has('');
	let alignments;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const [, key, href, title, hashes, heading, id, padding, remainder] = line.match(/^(?:(?:\s{0,3}(?:\[\s*(.*?)\s*\]:\s+(\S+?)\s*(?:\s('.*?'|".*?"|\(.*?\)))?|(#{1,6})\s+(.*?)(?:\s+#+(\S*))?))|(\s*)(.*?)\s*)$/);
		const oldlines = newlines;
		const nodes = [];
		let [, container] = stack[0];
		let whitespace = 0;
		let bullet, structure, string;

		if (key !== undefined && !references[key]) {
			const props = { href: buildPath(rootNames, href) };
			references[key] = props;
			
			if (title) {
				props.title = title;
			}

			continue;
		} else if (hashes) {
			locked = scopes.size && !scopes.has(id);

			if (locked) {
				continue;
			}
			
			const node = [hashes.length, {}];
			
			if (id) {
				node[1].id = id;
				nodes.unshift(['a', { href: encodeURI(`${headingPath}#${id}`) }]);
			}

			nodes.unshift(node);
			string = heading;
			stack.splice(1);
		} else if (!remainder) {
			if (newlines) {
				stack.splice(1);
			}

			newlines += 1;
			continue;
		} else if (locked) {
			continue;
		} else {
			whitespace = `${padding}`.replace('\t', '    ').length;
			newlines = 0;

			for (const [i, [indentation, node]] of stack.entries()) {
				if (whitespace < indentation) {
					stack.splice(i);
					break;
				}

				whitespace -= indentation;
				container = node;
			}
		}

		let previous = container[container.length - 1];

		if (previous?.[0] === 'li') {
			container = previous;
			previous = container[container.length - 1];
		}

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

			nodes.unshift(['pre', {}], ['code', {}, text]);
		} else if (/^ {0,3}(`{3,})/.test(line)) {
			ticks = line.match(/^ {0,3}(`+)/)?.[1]?.length;
			nodes.unshift(['pre', {}], ['code', {}, '']);
		} else if (!nodes.length) {
			[, bullet, structure, string] = remainder.match(/^(?:([-+*:]|\d+[.)]) {1,4}(?![\s-]+$))?(>|\|(?!\|.*?\|\|))?\s*(.*?)\s*$/);

			if (!bullet && !structure) {
				const [, dashes] = lines[i + 1]?.match?.(/^ {0,3}(=+|-+)\s*$/) || [];

				if (dashes) {
					nodes.unshift([dashes[0] === '=' ? 1 : 2, {}]);
					i++;
				} else if (locked) {
					continue;
				} else if (previous?.[0] === 'p' && !oldlines) {
					previous.push(['br']);
					container = previous;
				} else {
					nodes.unshift(['p', {}]);
				}
			}
		}

		switch (structure?.[0]) {
			case '>': {
				// handle blockquote here
				// - add to previous blockquote if oldlines is 0
				// - otherwise create new one
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
						previous.push(['tbody', {}]);

						for (const row of container.slice(2)) {
							for (const [i, cell] of row.slice(2).entries()) {
								const textAlign = alignments[i];
								cell[0] = 'th';

								if (textAlign) {
									cell[1].style = { textAlign };
								}
							}
						}
					}

					continue;
				}

				nodes.unshift(['tr', {}, ...remainder.slice(0, -1).split('|').map((text, i) => {
					const textAlign = alignments?.[i];
					const content = parseInline(text, rootNames, links);
					return ['td', textAlign ? { style: { textAlign } } : {}, ...content];
				})]);

				if (previous?.[0] !== 'table' || oldlines > 0) {
					nodes.unshift(['table', {}], ['tbody', {}]);
				} else {
					container = previous[previous.length - 1];
				}

				break;
			}
		}

		if (bullet) {
			const item = ['li', {}];
			let type = 'ol';
			let index = 0;

			switch (bullet) {
				case '-':
				case '+':
				case '*': {
					type = 'ul';
					break;
				}
				case ':': {
					type = 'dl';
					item[0] = 'dd';
					break;
				}
			}

			if (oldlines > 1 || previous?.[0] !== type) {
				const start = type === 'ol' ? bullet.slice(0, -1) : '1';
				const list = [type, start === '1' ? {} : { start }];
				nodes.unshift(list);
				stack.push([padding.length + bullet.length + 1, list]);
				spaced = false;
				index = 1;

				if (type === 'dl' && previous?.[0] === 'p') {
					const term = container.pop();
					term[0] = 'dt';
					list.push(term);
				}
			} else {
				container = previous;

				if (oldlines && !spaced) {
					const children = container.slice(2);
					spaced = true;

					for (const item of children) {
						if (inlines.has(item)) {
							const content = item.splice(2);
							item.push(['p', {}, ...content]);
						}
					}
				}
			}

			nodes.splice(index, 0, item);
			index += 1;

			if (spaced) {
				nodes.splice(index, 0, ['p', {}]);
			} else if (nodes.length === index) {
				inlines.add(item);
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
