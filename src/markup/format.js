export function format (expression) {
	let [string] = expression;
	if (string.startsWith('/')) return;
	const props = {};
	let content = [];
	let tag = '', name;

	if (/^\s*$/.test(string)) {
		[, tag] = expression.splice(0, 2);
	} else {
		[tag] = string.match(/^[^="\s]*/);
		expression[0] = string.slice(tag.length);
	}
	
	string = expression[0];

	if (/^\s*$/.test(string)) {
		const [, object] = expression.splice(0, 2);
		Object.assign(props, object);
	}

	for (let [i, value] of expression.entries()) {
		if (i % 2) {
			if (name) props[name] = value;
			name = undefined;
			continue;
		}

		while (true) {
			[, string = '', value] = value.match(/^\s*("[^"]*")?(.*)$/);
			if (name) props[name] = string.slice(1, -1);
			if (!value) break;

			const index = value.indexOf('=');
			string = value.slice(0, ~index ? index : undefined);
			const end = string.indexOf('/');

			if (~end) {
				string = string.slice(0, end);
				content = undefined;
			}

			string = string.replace(/"[^"]*"/g, ' ').trim();
			const names = string ? string.split(/\s+/) : [];

			if (~index) name = names.pop();
			for (const name of names) props[name] = true;
			if (!~index || ~end) break;

			value = value.slice(index + 1);
		}
	}

	const { '': key, ...attributes } = props;
	return { '': [content, key, tag], ...attributes };
}
