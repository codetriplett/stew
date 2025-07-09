// TODO: use dynamic import to load this and all Editor features
// - just deliver what is needed to render a page at first

const reserved = new Set([
	'abstract', 'arguments', 'await', 'boolean',
	'break', 'byte', 'case', 'catch',
	'char', 'class', 'const', 'continue',
	'debugger', 'default', 'delete', 'do',
	'double', 'else', 'enum', 'eval',
	'export', 'extends', 'false', 'final',
	'finally', 'float', 'for', 'function',
	'goto', 'if', 'implements', 'import',
	'in', 'instanceof', 'int', 'interface',
	'let', 'long', 'native', 'new',
	'null', 'package', 'private', 'protected',
	'public', 'return', 'short', 'static',
	'super', 'switch', 'synchronized', 'this',
	'throw', 'throws', 'transient', 'true',
	'try', 'typeof', 'var', 'void',
	'volatile', 'while', 'with', 'yield',
]);

// TODO: only treat note as module if it has a preformatted text above first heading that uses the 'default' format
// - default is an array in the file that is created, so it is not allowed as a custom formatter anyway
export function extractCode (file) {
	const summary = stew(file, ['/#']);
	const layout = stew(file, ['/']);

	if (!summary || !summary[1] || !layout || !layout[1]) {
		return;
	}

	const [, map, ...content] = layout;
	const { '': root, ...sections } = map;
	const [, name] = root.split('#');
	const [, index] = summary[1][''].split(':');

	if (!index) {
		return;
	}

	const claimed = new Set();
	const imports = {};
	const strings = [];
	let defaultString = '';

	for (const [name, section] of Object.entries(sections)) {
		const formattedName = name.replace(/-./g, m => m.slice(1).toUppercase());
		const [hash,, ...links] = section;
		const [type, index] = hash.split('#')[0].split(':');

		if (reserved.has(formattedName)) {
			console.error(`${formattedName} is a reserved word.`);
			continue;
		} else if (type[1] > 2) {
			continue;
		}

		for (const link of links) {
			const { href, title } = link[1];
			const [path, ...hashes] = href.split('#');
			let object = imports[path];

			if (!title || !/^\/./.test(path)) {
				continue;
			} else if (!object) {
				object = {};
				imports[path] = object;
			}

			const aliases = title.trim().split(/\s+/);

			for (const [i, alias] of aliases.entries()) {
				if (claimed.has(alias)) {
					continue;
				}

				object[alias] = hashes[i];
			}
		}

		const innerCode = content[index]?.[2]?.[2]?.trim?.();
		let string;

		if (innerCode[0] === '{') {
			string = `\nconst ${formattedName} = stew(${innerCode});`;
		} else {
			string = `\nexport function ${formattedName} () {\n${innerCode || ''}\n}`;
		}

		if (type === 'h2') {
			strings.push(string);
		} else if (type === 'h1' && !defaultString) {
			defaultString = string;
		}
	}

	if (defaultString) {
		strings.push(defaultString);
	}

	for (const [path, object] of Object.entries(imports).reverse()) {
		const entries = Object.entries(object);
		const index = entries.findIndex(([, hash]) => hash === '');
		const named = [];
		let string = 'import';

		if (index !== -1) {
			const [[alias]] = entries.splice(index, 1);
			string += ` ${alias}${entries.length ? ',' : ''}`;
		}

		for (const [alias, hash] of entries) {
			if (hash === undefined) {
				strings.unshift(`import * as ${alias} from '${path}';`);
			} else {
				named.push(hash === alias ? hash : `${hash || 'default'} as ${alias}`);
			}
		}

		string += `${named.length ? ` { ${named.join(', ')} }` : ''} from '${path}';`;
		strings.unshift(string);
	}

	let code = strings.join('\n');
	const formattedName = name.replace(/-./g, m => m.slice(1).toUppercase());
	const heading = sections[name]?.[1] || '';
	const definition = summary[Number(index) + 3]?.[2]?.[2];
	const schemaStart = definition.indexOf('{');
	let schemaFinish = definition.search(/(\{\s*|\n)\}/);
	schemaFinish = definition.indexOf('}', schemaFinish);
	const resources = definition.slice(0, schemaStart).trim();
	const styles = definition.slice(schemaFinish + 1).trim();
	let schema = definition.slice(schemaStart, schemaFinish + 1).trim();

	try {
		new Function(`return ${schema}`)();
	} catch (err) {
		console.error(`Schema syntax error: ${err.message}`);
		schema = '{}';
	}

	schema = schema.replace(/^\{[\r\n]*|[\r\n]*\}$/g, '');
	code += `\n\nexport default [${formattedName || 'null'}, {\n    '': '${heading}',${schema ? `\n${schema}` : ''}\n}${!styles ? '' : `, ['style', null, \`\n${styles}\n\`]`}`;

	for (const url of resources.split(/\s*\n+\s*/)) {
		if (!url.startsWith('/')) {
			continue;
		} else if (url.endsWith('.css')) {
			code += `,\n    ['link', { href: '${url}', rel: 'stylesheet' }]`;
		} else if (url.endsWith('.mjs')) {
			code += `,\n    ['script', { src: '${url}', type: 'module' }]`;
		} else if (url.endsWith('.js')) {
			code += `,\n    ['script', { src: '${url}' }]`;
		}
	}

	code += `${resources ? ',\n' : ''}];\n`;
	return code.replace(/^\n/, '');
}
