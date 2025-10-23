const stack = [['', { mode: null }]];
let isRestricted = false;

function layout ({ '': context, mode, description, callback }, ...children) {
	const { heading = 2 } = context;

	const [message, isError] = stew(async () => {
		if (!callback || isRestricted && mode !== 'only') {
			return [];
		}

		try {
			const message = callback();
			return [typeof message === 'string' ? message : ''];
		} catch (err) {
			return [typeof err === 'string' ? err : err.message, true];
		}
	}, [], []);

	return ['', { heading: heading + 1 },
		[heading, null,
			callback && ['input', { type: 'checkbox', checked: isError }],
			description,
		],
		message && ['pre', null, message],
		...children,
	];
}

function print (value) {
	switch (typeof value) {
		case 'object': {
			return !value ? 'null' : Array.isArray(value) ? '[array Array]' : `[object Object]`;
		}
		case 'function': {
			return `[${value.name || 'function'} Function]`;
		}
		case 'string': {
			return `'${value}'`;
		}
	}

	return String(value);
}

function compare (expected, actual, indentation = 0, key) {
	if (typeof actual !== 'object' || typeof expected !== 'object') {
		if (actual === expected) {
			return;
		}

		return [
			Array(indentation).fill('    ').join(''),
			key ? `${key}: ` : '',
			print(actual),
			indentation ? ',' : '',
			` // ${print(expected)}`,
		].join('');
	}

	const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
	const isArray = Array.isArray(actual);
	const lines = [];
	let prevMiss = -1;

	for (const [i, key] of [...keys].entries()) {
		const result = compare(expected[key], actual[key], indentation + 1, isArray ? undefined : key);

		if (!result) {
			continue;
		} else if (prevMiss < i - 1) {
			lines.push(`${Array(indentation + 1).fill('    ').join('')}...(${i - prevMiss - 1}),`);
		}

		lines.push(result);
		prevMiss = i;
	}

	if (!lines.length) {
		return;
	}

	const tabs = Array(indentation).fill('    ').join('');
	const open = `${tabs}${isArray ? '[' : '{'}`;
	const close = `${tabs}${isArray ? ']' : '}'}`;
	return [open, ...lines, close].join('\n');
}

export function expect (actual, expected) {
	const mismatch = compare(expected, actual);

	if (mismatch) {
		throw mismatch;
	}
}

function test (mode, description, callback, ...children) {
	if (mode === 'only') {
		isRestricted = true;
	}

	const [parent] = stack;
	const node = [layout, { mode: mode ?? parent.mode, description, callback, callback }, ...children];
	parent.push(node);
	return node;
}

function group (mode, description, callback, ...children) {
	const [parent] = stack;
	const node = [layout, { mode: mode ?? parent.mode, description }, ...children];
	parent.push(node);
	stack.unshift(node);
	callback();
	stack.shift();
	return node;
}

const root = (...params) => test(null, ...params);
root.skip = (...params) => test('skip', ...params);
root.only = (...params) => test('only', ...params);
root.group = (...params) => group(null, ...params);
root.group.skip = (...params) => group('skip', ...params);
root.group.skip = (...params) => group('only', ...params);

export default root
