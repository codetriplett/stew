import { selfClosingTags } from './document';

// TODO: close previous paragrah if any of these are used
// - open new paragraph when they are closed
const blockTags = new Set([
	'address', 'article', 'aside', 'blockquote', 'canvas', 'dd', 'div',
	'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav',
	'noscript', 'ol', 'p', 'pre', 'section', 'table', 'tfoot', 'ul', 'video',
]);

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
		'|(#{1,6})\\s+(.*?)(?:\\s+\\{#(\\S*)\\})?(?:\\s+#+)?',
		'|(=+|-+)',
		'|((?:\\*\\s+){3,}|(?:-\\s+){3,}|(?:_\\s+){3,})',
		'|(\\|(?!\\|.*?\\|\\|).*?)\\|?',
		'|(.*?)',
	')',
'(\\s*)$'].join(''));

const inlineRegex = new RegExp(['^(.*?)(?:',
	'(\\*{1,2}|_{1,2}|~{1,2}|:{2}|\\|{2})|(`+)|:(.+?):',
	'|<(?:\\/(\\S+?)\\s*|(https?:\\/\\/\\S*?)|([^\\/\\s].*?\\/?\\s*))>',
	'|(!)?\\[\\s*(.*?)\\s*\\]\\s*(?:\\(\\s*(.*?)\\s*(\'.*?\'|".*?")?\\s*\\)|\\[\\s*(.*?)\\s*\\])',
'|$)(.*)$'].join(''));

const tags = {
	'*': 'em',
	'_': 'em',
	'~': 's',
	'**': 'strong',
	'__': 'strong',
	'~~': 'u',
	'::': 'mark',
	'||': 'span',
};

export function parseInline (string, stack, links, customizations) {
	const [container] = stack;
	const root = stack[stack.length - 1];
	const formatting = new Set();
	let spaceable = Array.isArray(container[container.length - 1]);

	while (string) {
		let [,
			before, symbol, ticks, emoji, close, url, open,
			image, text, href, title, key, remainder,
		] = string.match(inlineRegex);

		const [container] = stack;
		const populated = container.length > 2 || /\S$/.test(before);
		const breakpoint = container[0] === 'td' ? before.indexOf('|') : -1;
		let node;

		if (breakpoint !== -1) {
			before = string.slice(0, breakpoint);
			remainder = string.slice(breakpoint + 1);
			string = remainder;
		} else if (text !== undefined) {
			node = [image ? 'img' : 'a', null];

			if (!image) {
				parseInline(text, [node], links, customizations);
				links[1].splice(-1, 0, node);
			}

			if (key !== undefined) {
				if (image) {
					node.push(text);
				}

				node[1] = (key || getText(node)).toLowerCase();
				links.push(node);
			} else {
				const path = buildPath(links[0], href);
				const props = image ? { src: path } : { href: path };
				node[1] = props;

				if (image) {
					props.alt = text;
				}

				if (title) {
					props.title = title.slice(1, -1);
				}
			}
		} else if (emoji) {
			node = customizations[emoji];
		} else if (container[0] === symbol && populated) {
			stack.shift();
		} else if (container[0] === symbol?.[0] && populated) {
			stack.shift();
			remainder = `${symbol[1]}${remainder}`;
		} else if (symbol && /^\S/.test(remainder)) {
			node = [symbol, null];
			stack.unshift(node);
			formatting.add(node);
		} else if (symbol) {
			before += symbol;
		} else if (ticks) {
			const index = remainder.indexOf(ticks);
			node = ['code', null, index !== -1 ? remainder.slice(0, index) : remainder];
			remainder = index !== -1 ? remainder.slice(index + ticks.length) : '';
		} else if (close) {
			const index = stack.findIndex(node => node[0] === close);
			stack.splice(0, Math.min(stack.length - 1, index + 1));
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

			if (blockTags.has(tagName) && !root[1]) {
				stack[stack.length - 1][1] = { unwrapped: true };
			}
		}

		if (/\S/.test(before)) {
			container.push(before.replaceAll('---', '&mdash;').replaceAll('--', '&ndash;'));
		}
		
		if (string === remainder) {
			break;
		} else if (node) {
			if (spaceable && Array.isArray(node)) {
				container.push(' ');
				spaceable = false;
			}

			container.push(node);
		}
		
		string = remainder;
	}

	for (const node of formatting) {
		const symbol = node[0];
		node[0] = tags[symbol];

		if (symbol === '||') {
			node[1] = {
				style: { color: 'transparent' },
				onclick: {},
			};
		}
	}

	return string;
}

function parseNesting (string, stack, containers, oldlines) {
	const nodes = [];
	let extra = 0;

	const symbols = string.replace(/\t/g, (m, index) => {
		const width = 4 - ((index + extra) % 4);
		extra += width - 1;
		return ' '.repeat(width);
	}).match(/((?:\s+|>|\S+(?:\s{0,4}(?!\s)|\s)))+?/g) || [];

	if (oldlines > 1 && stack[0][0] !== 'code' || oldlines > 0 && !symbols.length) {
		stack.splice(0, stack.length - 1);
	}

	let depth = stack.length - 2;
	let indentation = 0;
	let props, padding;

	while (symbols.length) {
		let symbol = symbols.shift();
		let type = 'ol';
		let subtype = 'li';
		let extra = 0;
		symbol.replaceAll('\t', (m, index) => extra += 3 - ((index + extra) % 4));
		indentation += symbol.length;

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
				subtype = undefined;
				indentation = 0;
				break;
			}
			case ' ': {
				if (indentation === symbol.length) {
					depth = stack.findIndex(entry => indentation >= entry[1].indentation) - 1;
					const overage = indentation - stack[depth + 1][1].indentation;

					if (overage < 4) {
						continue;
					}

					symbol = symbol.slice(indentation - overage);
				}

				type = 'pre';
				subtype = 'code';
				indentation = undefined;
				padding = `${symbol.slice(4)}${symbols.splice(0).join('')}`;
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
			props = { spaced: !subtype, wrapper };
			const node = [subtype || type, props];
			containers.add(node);
			nodes.unshift(node);
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
		props.padding = padding;
		stack.splice(0, depth);
		depth = -1;
	}
	
	if (oldlines === 1) {
		stack[0][1].spaced = true;
	}

	return nodes;
}

function getText (node) {
	if (typeof node === 'string') {
		return node;
	}

	return node[0] === 'br' ? ' ' : node.slice(2).map(getText).join('');
}

export default function parse (content, rootPath = '', customizations = {}) {
	if (!content) {
		return;
	}

	const [, trimmedPath, hash] = rootPath.match(/^\/?(.*?)\/?(?:#+(.*))?$/);
	const scopes = new Set(hash?.split?.(/#+/) || []);
	const headingPath = scopes.size ? `/${trimmedPath}` : '';
	const lines = content.split(/\r\n|\r|\n/);
	const main = ['', { spaced: true, indentation: 0 }];
	const stack = [main];
	const tags = [main];
	const { '': formatter } = customizations;
	const rootNames = trimmedPath ? trimmedPath.split('/') : [];
	const links = [rootNames, [`/${trimmedPath}`, '']];
	const headingStack = [links[1]];
	const map = { '': links[1] };
	const containers = new Set(stack);
	const references = {};
	let locked = scopes.size && !scopes.has('');
	let candidate = ''
	let newlines = 1;
	let tickCount = 0;
	let checkboxCount = 0;
	let alignments, reference, format;

	for (let line of lines) {
		if (!/\S/.test(line)) {
			newlines += newlines < 0 ? 2 : 1;
			continue;
		} else if (tags.length > 1) {
			for (const container of stack) {
				if (container[0] !== 'blockquote') {
					break;
				}

				line = line.replace(/^\s*>\s*/, '');
			}

			parseInline(` ${line.trim()} `, tags, links, customizations);
			newlines = -1;
			continue;
		} else if (tickCount) {
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
		stack.unshift(...nodes);

		if (key !== undefined) {
			key = key.toLowerCase();

			if (!references[key]) {
				reference = { href: buildPath(rootNames, href) };
				references[key] = reference;
			}

			continue;
		}
		
		const [node] = stack;
		let previous = node[node.length - 1];
		newlines = string && whitespace.length < 2 ? -1 : 0;

		if (hashes) {
			const node = [hashes.length, null];
			nodes.unshift(node);
			string = heading;
		} else if (underline && oldlines < 1 && (candidate || previous?.[0] === '')) {
			const type = underline[0] === '=' ? 1 : 2;
			hashes = '#'.repeat(type);

			if (candidate) {
				nodes.unshift([type, '']);
				string = ` ${candidate.replace(/<br>$/, '')}`;
			} else {
				container = previous;
				container[0] = type;
			}
		} else if (locked) {
			if (!string || oldlines > 0) {
				candidate = '';
			}

			candidate += `${string}${whitespace.length > 1 ? '<br>' : ' '}`;
			continue;
		} else if (node[0] === 'code') {
			const { padding = '' } = node[1];
			string = `${padding}${line.slice(symbols.length)}`;

			if (tickCount && string.match(/^ {0,3}(`+)\s*$/)?.[1]?.length >= tickCount) {
				tickCount = 0;
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
		} else if (underline) {
			if (underline[0] === '=') {
				string = underline;
			} else {
				dashes = underline;
			}
		} else if (/^`{3,}[^`]*$/.test(string)) {
			tickCount = string.search(/[^`]|$/);
			format = string.slice(tickCount).trim();
			string = '';
		} else if (checkbox) {
			const checked = checkbox.toLowerCase() === 'x';
			const fragment = ['', null, ['input', { type: 'checkbox', checked, id: `c-${checkboxCount}` }]];
			nodes.unshift(['label', { for: checkboxCount }], fragment);
			checkboxCount++;
		} else if (table) {
			let remainder = `${table.slice(1)}|`;

			if (/^(\s*:?-+:?\s*\|)+$/.test(remainder)) {
				const isFirst = !alignments;
				const container = previous?.[2];

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
			} else {
				if (previous?.[0] !== 'table' || oldlines > 0) {
					nodes.unshift(['tbody', null], ['table', null]);
				} else {
					container = previous[previous.length - 1];
				}

				const cells = [];
				let i = 5;

				while (remainder && i--) {
					const textAlign = alignments?.[cells.length];
					const node = ['td', textAlign ? { style: { textAlign } } : null];
					remainder = parseInline(remainder, [node], links, customizations);
					cells.push(node);
				}

				nodes.unshift(['tr', null, ...cells]);
			}
		}
		
		candidate = '';
		
		if (!table) {
			alignments = undefined;

			if (title) {
				reference.title = title;
			} else if (dashes) {
				nodes.unshift(['hr', null]);
			}
		}
		
		for (const node of nodes.reverse()) {
			if (containers.has(node) && node[1].wrapper) {
				const { wrapper } = node[1];
				container.push(wrapper);
				container = wrapper;
			}

			container.push(node);
			container = node;
		}

		if (string) {
			if (containers.has(container)) {
				if (oldlines > 0 || previous?.[0] !== '') {
					previous = ['', null];
					container.push(previous);
				} else if (!oldlines) {
					previous.push(['br']);
				}

				if (tags[tags.length - 1] !== previous) {
					tags.splice(0, tags.length, previous);
				}

				parseInline(` ${string} `, tags, links, customizations);
			} else {
				parseInline(string, [container], links, customizations);
			}
		}

		if (!hashes || stack.length > 1) {
			continue;
		}

		const [type] = container;
		const text = getText(container).trim().replace(/^\s+$/, ' ');

		if (!id) {
			id = text.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

			if (!id || /^[a-z]-\d+$/.test(id)) {
				id = `h-${Object.keys(map).length - 1}`;
			}
		}

		const borrowHeading = scopes.size === 1 && scopes.has('');
		locked = !borrowHeading && scopes.size && !scopes.has(id);

		if (locked) {
			stack[0].pop();
			continue;
		} else if (!scopes.size) {
			container[1] = { id };
		}
		
		container.push(['a', {
			href: `${headingPath}#${borrowHeading ? '' : id}`,
		}, ...container.splice(2)]);
	
		const array = [text, `h${type}`];
		map[id] = array;
		links[1] = array;
		const index = headingStack.findIndex(array => !(array[array.length - 1][1] >= type));
		headingStack.splice(0, index, array);
		const section = headingStack[1];
		section[section.length - 1] += `#${id}`;

		if (borrowHeading) {
			main.splice(2, 0, stack[0].pop());
			break;
		}
	}

	for (const link of links.slice(2)) {
		const key = link[1];
		const { href, ...attributes } = references[key];
		link[1] = attributes;

		if (link[0] === 'img') {
			attributes.src = href;
			link[1].alt = link.pop();
		} else {
			attributes.href = href;
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
				} else if (spaced && !child[1]?.unwrapped) {
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

	const root = map[''];
	map[''] = root.pop();
	headingStack[headingStack.length - 2]?.splice?.(1, 0, ...root.slice(1));
	main[1] = map;
	return main;
}
