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
	'(\\s*(?::\\s{1,4})?(?:[>\s]+|(?:[-+*]|\\d+[.)])(?:\\s{1,4}|$))*\\s*)(?:',
		'(?:\\[\\s*(.*?)\\s*\\]:\\s+(<.*?>|[^<>]|[^<].*?[^>])(?:\\s+|$))?(\'.*?\'|".*?"|\\(.*?\\))?',
		'|(#{1,6})\\s+(.*?)(?:\\s+#+(\\S*))?',
		'|(=+|-+)',
		'|((?:\\*\\s+){3,}|(?:-\\s+){3,}|(?:_\\s+){3,})',
		'|(\\[[ xX-_]\\](?!\\S)|\\|(?!\\|.*?\\|\\|))?\\s*(.*?)',
	')',
'(\\s*)$'].join(''));

const inlineRegex = new RegExp(['^(.*?)(?:',
	// <http://www.domain.com/path> (a) quick link
	// <span></span>


	'(\\*\\*.+?\\*\\*|__.+?__)',
	'|(\\*.+?\\*|_.+?_)',
	'|~~(.+?)~~|~(.+?)~',
	'|(`+)|::(.*?)::|:(.*?):|(-{2,3})',
	'|(!)?\\[\\s*(.*?)\\s*\\]\\s*(?:\\(\\s*(.*?)\\s*(\'.*?\'|".*?")?\\s*\\)|\\[\\s*(.*?)\\s*\\])',
	'|\\|\\|(.+?)\\|\\|',
'|$)(.*)$'].join(''));

export function parseInline (string, rootNames, links, map, close) {
	// TODO: process expressions in text (e.g. bold, strikethrough, ndash, etc)
	// - return array of children to spread onto parent element
	const content = [];
	let leftover = '';
	let previous;

	while (string) {
		const [,
			before, strong, em, strikethrough, underline,
			ticks, highlight, emoji, dashes,
			image, text, href, title, key,
			spoiler, remainder,
		] = string.match(inlineRegex);

		const index = before.indexOf(close);
		const strings = [];
		let node;
		string = remainder;

		if (/\S/.test(before)) {
			strings.push(before);
		}

		if (index !== -1) {
			strings[0] = before.slice(0, index);
			leftover =  `${before.slice(index + 1)}${remainder}`;
			string = '';
		} else if (text !== undefined) {
			node = [image ? 'img' : 'a', null, text];

			if (key !== undefined) {
				node[1] = (key || text).toLowerCase();
				links.add(node);
			} else {
				const props = { href: buildPath(rootNames, href) };
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
		} else if (dashes) {
			strings.push(dashes.length === 2 ? '&ndash;' : '&mdash;');
		} else if (emoji) {
			node = map[emoji];

			if (node && typeof node === 'string') {
				strings.push(node);
				node = undefined;
			}
		} else if (spoiler) {
			node = ['span', {
				onclick: {
					style: { color: 'transparent' },
				},
			}, spoiler];
		} else if (ticks) {
			const index = remainder.indexOf(ticks);
			const code = index !== -1 ? remainder.slice(0, index) : remainder;
			content.push(['code', null, code]);
			string = index !== -1 ? remainder.slice(index + ticks.length) : '';
			continue;
		} else if (remainder) {
			strings.push(remainder);
			string = '';
		}
		
		if (!node) {
			if (typeof previous === 'string') {
				strings.unshift(content.pop());
			}

			node = strings.join(' ');

			if (!/\S/.test(node)) {
				continue;
			}
		} else if (node[0] !== 'img') {
			const inside = parseInline(node.pop(), rootNames, links, map);
			node.push(...inside);
		}
		
		content.push(node);
		previous = node;
	}

	if (close) {
		content.push(leftover);
	}

	return content;
}

function parseNesting (string, stack, containers, oldlines) {
	const nodes = [];
	let fillCount = 0;

	let symbols = !string ? [''] : string.replace(/\t/g, (m, index) => {
		index += fillCount;
		const count = 4 - (index % 4);
		fillCount += count - 1;
		return Array(count).fill(' ').join('');
	}).match(/(\s+|(?:>|\S+)\s{0,4})+?/g);

	let indentation = /\S/.test(symbols[0]) ? 0 : symbols.shift().length;
	let depth;

	for (depth = 0; depth < stack.length; depth++) {
		if (indentation < stack[depth][1].indentation) {
			break;
		}
	}

	if (depth >= stack.length && oldlines > 0 && indentation > 3) {
		symbols = ['    '];
		indentation = 0;
		oldlines = 0;

		// TODO: find a cleaner way to do this
		if (depth > 1) {
			depth--;
		}
	} else if (oldlines > 1) {
		stack.splice(1);
		depth = 1;
	}

	let [container] = stack.splice(depth);

	for (const symbol of symbols) {
		let type = 'ol';
		let subtype = 'li';

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
			case ' ': {
				type = 'pre';
				subtype = 'code';
				break;
			}
		}

		let props = container?.[1] || {};
		let { wrapper } = props;

		if (type !== wrapper?.[0] && (subtype || oldlines > 0)) {
			const start = symbol.trim().slice(0, -1);
			wrapper = subtype && [type, start && start !== '1' ? { start } : null];
			props = { spaced: false, wrapper };
			const node = [subtype || type, props];
			containers.add(node);
			nodes.push(node);
			container = undefined;

			if (type === 'dl') {
				const container = stack[depth - 1];
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
		
		if (container) {
			stack.push(container);
			container = undefined;
		}

		indentation += symbol.length;
		props.indentation = indentation;
	}
	
	if (oldlines === 1) {
		stack[stack.length - 1][1].spaced = true;
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
	const rootNames = trimmedPath ? trimmedPath.split('/') : [];
	const lines = content.split(/\r\n|\r|\n/);
	const main = ['blockquote', { spaced: true, indentation: 0 }];
	const stack = [main];
	const containers = new Set(stack);
	const links = new Set();
	const references = {};
	let locked = scopes.size > 0 && !scopes.has('');
	let newlines = 1;
	let ticks = 0;
	let id = 0;
	let alignments, reference, format;

	// eventually add HTML structure (starts with </?\w+>)
	// - should probably be handled inline with an HTML stack to open and close tags (empty space)
	// - only wrap in p tag if there is text that isn't wrapped in a tag
	// - HTML will be converted to stew arrays just like other nodes in the layout
	// - at least no additional code will be needed to render the html properly

	for (let line of lines) {
		if (!/\S/.test(line)) {
			newlines += newlines < 0 ? 2 : 1;
			continue;
		} else if (ticks) {
			line = `\t${line}`;
		}

		let [,
			symbols, key, href, title,
			hashes, heading, id, underline,
			dashes, structure = '', string, whitespace,
		] = line.match(blockRegex);

		if (/^ {0,3}((-\s+){3,}|(\*\s+){3,})\s*$/.test(symbols)) {
			dashes = symbols.trim();
			symbols = '';
		}

// 		console.log(`|${symbols}|${key}|${href}|${title}|
// |${hashes}|${heading}|${id}|${underline}|
// |${dashes}|${structure}|${string}|`);

		const oldlines = newlines;
		// TODO: space/tab preformatted blocks should also ignore newlines
		// - maybe skip the oldlines override for ticks here
		// - have parseNesting skip its oldline > 0 check if it already sees the final item on stack is preformatted
		const nodes = parseNesting(symbols, stack, containers, ticks ? 1 : oldlines);
		let container = stack[stack.length - 1];
		stack.push(...nodes);
		
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

		const node = stack[stack.length - 1];
		let previous = node[node.length - 1];
		newlines = string && !structure && whitespace.length < 2 ? -1 : 0;
		
		if (node[0] === 'code') {
			// parseNesting needs to inform how to trim the line properly
			// - maybe put a prop on node[1] with the whitespace overage (in space characters only)
			// - then trim the beginning of line and apply the whitespace to the begginning
			// - don't have it maintain tabs in the whitespace since those can be broken up if indentation isn't a multiple of 4
			string = line.replace(/^(\t| {4})/, '');

			if (ticks && string.match(/^ {0,3}(`+)\s*$/)?.[1]?.length >= ticks) {
				ticks = 0;
				format = undefined;
				continue;
			} else if (!nodes.length) {
				const newlines = Math.max(0, oldlines) + (node[2] ? 1 : 0);
				node[2] += `${Array(newlines).fill('\n').join('')}${string}`;
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
		} else if (structure[0] === '[') {
			// TOOD: handle checkbox here
			// - xX are checked, all rest are unchecked
			// - use number ids (iterate for each checkbox found)
			id++;
		} else if (structure[0] === '|') {
			// TODO: move this to a separate parseTable function
			let remainder = string.endsWith('|') ? string : `${string}|`;
			string = '';

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

			// TODO: have parseInline detect when each cell closes by passing in '|' as the closing symbol
			// - this way spoilers will be allowed in the cells

			const cells = [];

			while (remainder) {
				const textAlign = alignments?.[cells.length];
				const content = parseInline(remainder, rootNames, links, emoji, '|');
				remainder = content.pop();
				cells.push(['td', textAlign ? { style: { textAlign } } : null, ...content]);
			}

			nodes.push(['tr', null, ...cells]);
		}

		if (title) {
			reference.title = title;
		} else if (underline || dashes) {
			nodes.push(['hr']);
		}

		for (const node of nodes) {
			if (containers.has(node) && node[1].wrapper) {
				const { wrapper } = node[1];
				container.push(wrapper);
				container = wrapper;
			}

			container.push(node);
			container = node;
		}

		if (container[0] !== 'tr') {
			alignments = undefined;
		}

		if (string) {
			const content = parseInline(string, rootNames, links, emoji);

			if (containers.has(container)) {
				if (oldlines > 0 || previous[0] !== '') {
					previous = ['', null];
					container.push(previous);
				} else if (!oldlines) {
					content.unshift(['br']);
				}
				
				container = previous;
			}

			let sibling = container.pop();

			if (typeof sibling === 'string' && typeof content[0] === 'string') {
				sibling += ` ${content.shift()}`;
			}

			container.push(sibling, ...content);
		}
	}

	for (const link of links) {
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
			const node = emoji['']?.(container[2], format);

			if (Array.isArray(node)) {
				wrapper.splice(0, 3, ...node);
			} else if (node !== undefined) {
				container[2] = node;
			}
		}
	}

	main[0] = 'main';
	return main;
}
