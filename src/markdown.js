import { selfClosingTags } from './document';

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

const blockRegex = new RegExp(['^',
	'(\\s*(?:[>\\s]+|(?:[-+*:]|\\d+[.)])(?:\\s{1,4}|\\t|$))*\\s*)(?:\\[([ xX-_])\\]\\s(?=\\S))?(?:',
		'(?:\\[\\s*(.*?)\\s*\\]:\\s+(<.*?>|[^<>]|[^<].*?[^>])(?:\\s+|$))?(\'.*?\'|".*?"|\\(.*?\\))?',
		'|(#{1,6})\\s+(.*?)(?:\\s+#+(\\S*))?',
		'|(=+|-+)',
		'|((?:\\*\\s+){3,}|(?:-\\s+){3,}|(?:_\\s+){3,})',
		'|(\\|(?!\\|.*?\\|\\|).*?)\\|?',
		'|(.*?)',
	')',
'(\\s*)$'].join(''));

const inlineRegex = new RegExp(['^(.*?)(?:',
	'(\\*\\*.+?\\*\\*|__.+?__)',
	'|(\\*.+?\\*|_.+?_)',
	'|~~(.+?)~~|~(.+?)~',
	'|(`+)|::(.+?)::|:(.+?):',
	'|(!)?\\[\\s*(.*?)\\s*\\]\\s*(?:\\(\\s*(.*?)\\s*(\'.*?\'|".*?")?\\s*\\)|\\[\\s*(.*?)\\s*\\])',
	'|\\|\\|(.+?)\\|\\|',
	'|<(?:\\/(\\S+)|(https?:\\/\\/.*?)|([^\\/\\s].*?\\/?))>',
'|$)(.*)$'].join(''));

export function parseInline (string, stack, map) {
	const links = stack[stack.length - 1];

	while (string) {
		let [,
			before, strong, em,
			strikethrough, underline,
			ticks, highlight, emoji,
			image, text, href, title, key,
			spoiler, close, url, open, remainder,
		] = string.match(inlineRegex);

		const [container] = stack;
		const breakpoint = container[0] === 'td' ? before.indexOf('|') : -1;
		let node;

		if (breakpoint !== -1) {
			before = string.slice(0, breakpoint);
			remainder = string.slice(breakpoint + 1);
		} else if (text !== undefined) {
			node = [image ? 'img' : 'a', null, text];

			if (key !== undefined) {
				node[1] = (key || text).toLowerCase();
				links.push(node);
			} else {
				const props = { href: buildPath(links[0], href) };
				node[1] = props;

				if (title) {
					props.title = title.slice(1, -1);
				}
			}
		} else if (strong) {
			node = ['strong', null, strong.slice(2, -2)];
		} else if (em) {
			node = ['em', null, em.slice(1, -1)];
		} else if (underline) {
			node = ['u', null, underline];
		} else if (strikethrough) {
			node = ['s', null, strikethrough];
		} else if (highlight) {
			node = ['mark', null, highlight];
		} else if (spoiler) {
			node = ['span', {
				onclick: {
					style: { color: 'transparent' },
				},
			}, spoiler];
		} else if (emoji) {
			node = map[emoji];
		} else if (close) {
			const index = stack.findIndex(node => node[0] === close);
			stack.splice(0, index === -1 ? stack.length - 1 : index + 1);
		} else if (url) {
			node = ['a', { href: url }, url];
		} else if (open) {
			const [tagName, ...rest] = open.match(/^\S+|[^='"\s\/]+(\s*=\s*('.*?('|$)|".*?("|$)|[^='"\s]+))?/g);
			const attributes = rest.length ? {} : null;
			node = [tagName, attributes];

			for (const string of rest) {
				const [name, value] = string.split(/\s*=\s*['"]?(.*)/s);
				attributes[name] = value === undefined ? true : value.replace(/['"]$/, '');
			}

			if (!selfClosingTags.has(tagName) && !open.endsWith('/')) {
				stack.unshift(node);
			}
		} else if (ticks) {
			const index = remainder.indexOf(ticks);
			node = ['code', null, index !== -1 ? remainder.slice(0, index) : remainder];
			remainder = index !== -1 ? remainder.slice(index + ticks.length) : '';
		}

		if (/\S/.test(before)) {
			container.push(before.replaceAll('---', '&mdash;').replaceAll('--', '&ndash;'));
		}
		
		if (string === remainder) {
			break;
		} else {
			string = remainder;
		}

		if (!node) {
			break;
		} else if (Array.isArray(node) && node.length > 2 && !image && !ticks && !emoji) {
			parseInline(node.pop(), [node, links], map);
		}

		container.push(node);
	}

	return string;
}

function parseNesting (string, stack, containers, oldlines) {
	const nodes = [];
	const symbols = string.match(/(\s+|(?:>|\S+)\s{0,4})+?/g) || [];
	let depth = stack.length === 1 || oldlines > 0 ? stack.length - 2 : 0;
	let indentation = 0;
	let props;

	while (symbols.length) {
		const symbol = symbols.shift();
		let type = 'ol';
		let subtype = 'li';
		let extra = 0;
		symbol.replaceAll('\t', (m, index) => extra += 3 - ((index + extra) % 4));
		indentation += symbol.length + extra;

		switch (symbol[0]) {
			case '>': {
				type = 'blockquote';
				subtype = undefined;
				break;
			}
			case ':': {
				type = 'dl';
				subtype = 'dd';
				break;
			}
			case '-': case '+': case '*': {
				type = 'ul';
				break;
			}
			case ' ': case '\t': {
				if (indentation === symbol.length + extra) {
					depth = stack.findIndex(entry => indentation >= entry[1].indentation) - 1;
					const overage = indentation - stack[depth + 1][1].indentation;

					if (overage > 3) {
						const remainder = symbols.splice(0);
						symbols.push(`${' '.repeat(overage - 3)}${remainder.join('')}`);
					}

					continue;
				}

				type = 'pre';
				subtype = 'code';
				indentation += 4;
				oldlines = 0;
				break;
			}
		}

		const container = stack[depth];
		props = container?.[1];
		let { wrapper } = props || {};

		if ((type !== wrapper?.[0] || oldlines > 1) && (type !== container?.[0] || oldlines > 0)) {
			const start = symbol.trim().slice(0, -1);
			wrapper = subtype && [type, start && start !== '1' ? { start } : null];
			props = { spaced: false, remainder: symbol.length - 1, wrapper };
			const node = [subtype || type, props];
			containers.add(node);
			nodes.push(node);
			depth++;

			if (type === 'dl') {
				const container = stack[depth];
				const term = container[container.length - 1];

				if (term?.[0] === '') {
					container.pop();
					term[0] = 'dt';
					wrapper.push(term);
				}
			}
		} else if (subtype && subtype !== 'code') {
			wrapper.splice(-1, 0, [...container.slice(0, 2), ...container.splice(2)]);
		}

		props.indentation = indentation;
		stack.splice(0, depth);
		depth = -1;
	}
	
	if (oldlines === 1) {
		stack[0][1].spaced = true;
	}

	return nodes;
}

export default function parse (content, rootPath = '', emoji = {}) {
	if (!content) {
		return;
	}

	const [, trimmedPath, hash] = rootPath.match(/^\/?(.*?)\/?(?:#+(.*))?$/);
	const scopes = new Set(hash?.split?.(/#+/) || []); // check if hash units are used, e.g. #123abc is really the #abc hash but with a variation value of 123
	const headingPath = scopes.size ? `/${trimmedPath}` : '';
	const lines = content.split(/\r\n|\r|\n/);
	const main = ['main', { spaced: true, indentation: 0 }];
	const stack = [main];
	const { '': formatter } = emoji;
	const references = {};
	const rootNames = trimmedPath ? trimmedPath.split('/') : [];
	const links = [rootNames];
	const containers = new Set(stack);
	const tags = [];
	let locked = scopes.size > 0 && !scopes.has('');
	let newlines = 1;
	let ticks = 0;
	let index = 0;
	let alignments, reference, format;

	for (let line of lines) {
		if (!/\S/.test(line)) {
			newlines += newlines < 0 ? 2 : 1;
			continue;
		} else if (ticks) {
			line = `\t${line}`;
		}

		let [,
			symbols, checkbox, key, href, title,
			hashes, heading, id, underline,
			dashes, table, string, whitespace,
		] = line.match(blockRegex);

		if (/^ {0,3}((-\s+){3,}|(\*\s+){3,})\s*$/.test(symbols)) {
			dashes = symbols.trim();
			symbols = '';
		}

		const oldlines = newlines;
		const nodes = parseNesting(symbols, stack, containers, oldlines);
		let [container] = stack;

		if (key !== undefined) {
			key = key.toLowerCase();

			if (!references[key]) {
				reference = { href: buildPath(rootNames, href) };
				references[key] = reference;
			}
		} else if (hashes && stack.length < 2) {
			locked = stack.length === 1 && scopes.size && !scopes.has(id);
		}

		if (locked) {
			continue;
		}

		const node = nodes[nodes.length - 1] || stack[0];
		let previous = node[node.length - 1];
		newlines = string && !table && whitespace.length < 2 ? -1 : 0;
		
		if (node[0] === 'code') {
			const { remainder } = node[1];
			string = line.slice(symbols.length - remainder);

			if (ticks && string.match(/^ {0,3}(`+)\s*$/)?.[1]?.length >= ticks) {
				ticks = 0;
				format = undefined;
				continue;
			} else if (!nodes.length) {
				const newlines = Math.max(0, oldlines) + (node[2] ? 1 : 0);
				node[2] += `${'\n'.repeat(newlines)}${string}`;
				continue;
			}

			node[1].format = format;
			node.push(string);
			string = '';
		} else if (hashes) {
			const node = [hashes.length, null];
			nodes.push(node);
			string = heading;
			
			if (id) {
				node[1] = { id };
				nodes.push(['a', { href: encodeURI(`${headingPath}#${id}`) }]);
			}
		} else if (underline) {
			const type = underline[0] === '=' ? 1 : 2;

			if (oldlines < 1 && previous?.[0] === '') {
				previous[0] = type;
				continue;
			} else if (type === 1) {
				string = underline;
			} else {
				dashes = underline;
			}
		} else if (/^`{3,}[^`]*$/.test(string)) {
			ticks = string.search(/[^`]|$/);
			format = string.slice(ticks).trim();
			newlines = oldlines;
			continue;
		} else if (checkbox) {
			const checked = checkbox.toLowerCase() === 'x';
			const fragment = ['', null, ['input', { type: 'checkbox', checked, id: index }]];
			nodes.push(fragment, ['label', { for: index }]);
			index++;
		} else if (table) {
			let remainder = `${table.slice(1)}|`;

			if (/^(\s*:?-+:?\s*\|)+$/.test(remainder)) {
				const isFirst = !alignments;
				container = previous?.[2];

				alignments = remainder.split(/\s*\|\s*/).slice(0, -1).map(string => {
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

			const cells = [];
			let i = 5;
			
			while (remainder && i--) {
				const textAlign = alignments?.[cells.length];
				const node = ['td', textAlign ? { style: { textAlign } } : null];
				remainder = parseInline(remainder, [node, links], emoji);
				cells.push(node);
			}

			nodes.push(['tr', null, ...cells]);
		}

		if (title) {
			reference.title = title;
		} else if (underline || dashes) {
			nodes.push(['hr']);
		}

		for (const node of nodes) {
			if (containers.has(node)) {
				stack.unshift(node);

				if (node[1].wrapper) {
					const { wrapper } = node[1];
					container.push(wrapper);
					container = wrapper;
				}
			}

			container.push(node);
			container = node;
		}

		if (container[0] !== 'tr') {
			alignments = undefined;
		}

		if (string) {
			if (containers.has(container)) {
				if (oldlines > 0 || previous[0] !== '') {
					previous = ['', null];
					container.push(previous);
				} else if (!oldlines) {
					previous.push(['br']);
				} else {
					string = ` ${string}`;
				}
				
				container = previous;
			}

			// TODO: clean this up a bit
			// - tags should be a part of stack, but inline shouldn't be able to close part of stack controlled by markdown syntax
			// - reverse direction of stack to have innermost ones at the start, like inline expects
			// - have inline parse not splice out entries that are in containers set (pass as props of last item in stack, along with links as its children)
			// - the goal should be that opening a tag on one line allows markdown to be added to it (e.g. headlines, lists, etc)
			tags.push(container, links);
			parseInline(string, tags, emoji);
			tags.splice(-2);
		}
	}

	for (const link of links.slice(1)) {
		const key = link[1];
		link[1] = { ...references[key] };

		if (link[0] === 'image') {
			link[1].alt = link.pop();
		}
	}

	for (const container of containers) {
		const { spaced, format, wrapper = ['', null, container] } = container[1];

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

		if (format !== undefined) {
			const node = formatter?.(container[2], format);

			if (Array.isArray(node)) {
				wrapper.splice(0, 3, ...node);
			} else if (node !== undefined) {
				container[2] = node;
			}
		}
	}

	return main;
}
