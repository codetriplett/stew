// TODO: use dynamic import to load this and all Editor features
// - just deliver what is needed to render a page at first
export function extractCode (file) {
	const layout = stew(file, ['/']);
	const [, map, ...content] = layout;
	const { '': root, ...sections } = map;
	const [type, name] = root[0].split('#');
	const [, index] = type.split(':');

	if (!index) {
		return;
	}
	
	// TODO: add imports by using links from sections
	// - gather all unique paths and which hashes are used for each (stored in Set)
	// - have # bring in default, and have rest be named
	// - use title attribute for aliases and barrel imports (no hash, but has title)
	// - need to check whether each path is an actual module before adding as import (and whether each hash qualifies)

	const claimed = new Set();
	const imports = {};
	const strings = [];
	let defaultString = '';

	for (const [name, section] of Object.entries(sections)) {
		const [hash,, ...links] = section;
		const [type, index] = hash.split('#')[0].split(':');

		if (type[1] > 2) {
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
			string = `\nconst ${name} = stew(${innerCode});`;
		} else {
			string = `\nexport function ${name} () {\n${innerCode || ''}\n}`;
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
	const heading = sections[name]?.[1] || '';
	const definition = content[index]?.[2]?.[2];
	const schemaStart = definition.indexOf('{');
	let schemaFinish = definition.search(/\n\s*\}/);
	schemaFinish = definition.indexOf('}', schemaFinish);
	const resources = definition.slice(0, schemaStart).trim();
	const styles = definition.slice(schemaFinish + 1).trim();
	let schema = definition.slice(schemaStart, schemaFinish + 1).trim();

	try {
		new Function(`return ${schema}`)();
	} catch (err) {
		console.error(`Schema syntax error: ${err.message}`);
		schema = '{\n}';
	}

	code += `\n\nexport default [${name || 'null'}, {\n    '': '${heading}',${schema.slice(1)}, ['style', null,\n\`${styles}\`]`;

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
