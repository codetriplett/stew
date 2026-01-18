const stack = [['', { mode: null, heading: 1, update: () => {} }, ['', null]]];
let isRestricted = false;

function component ({ mode, heading, description, callback, update }, ...children) {
	const [message, status] = stew(async () => {
		if (!callback) {
			return [''];
		} if (mode === 'skip' || isRestricted && mode !== 'only') {
			return ['', null];
		}

		try {
			const message = await callback();
			return [typeof message === 'string' ? message : '', true];
		} catch (err) {
			return [typeof err === 'string' ? err : err.message, false];
		}
	}, [], ['']);

	const originalUpdate = stew(() => update, []);

	stew(null, [status, update], () => {
		if (typeof status === 'boolean') {
			originalUpdate();
		}
	});

	const container = ['', null,
		[heading, { className: status === undefined ? 'pending' : status === null ? 'skipped' : status ? 'success' : 'failure' }, description],
		message && ['pre', null, message],
		children.length > 0 && ['div', null, ...children],
	];

	return heading !== 2 ? container : ['div', { style: { position: 'relative' } },
		['template', { shadowrootmode: 'open' },
			['style', null, `
				* {
					margin: 0;
					font-size: 13px;
					font-weight: normal;
				}
				div {
					padding: 4px 0 4px 16px;
				}
				pre {
					margin-top: 4px;
					padding: 4px 8px;
					background: rgba(255, 255, 255, 0.25);
				}
				.success + pre {
					background: rgba(0, 255, 0, 0.25);
				}
				.failure + pre {
					background: rgba(255, 0, 0, 0.25);
				}
				.pending,
				.success,
				.failure,
				.skipped {
					&:before {
						margin-right: 4px;
					}
				}
				.pending:before {
					content: '⏳';
				}
				.success:before {
					content: '✅';
				}
				.failure:before {
					content: '❌';
				}
				.skipped:before {
					content: '🟡';
				}	
			`],
			container,
		],
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

function printType (type) {
	const name = type.toLowerCase();
	return `[${name[0].toUpperCase()}${name.slice(1)} ${name}]`;
}

function Expected (type) {
	this.type = type;
}

function compare (expected, actual, indentation = 0, key) {
	if (expected instanceof Expected) {
		// TODO: test this
		const { type } = expected;

		if (typeof type === 'function') {
			return (actual instanceof type) || `${printType(actual.constructor.name)} // ${printType(type.name)}`;
		} else {
			const actualType = typeof actual;
			return actualType === type || `${printType(actualType)} // ${printType(type)}`;
		}
	} else if (typeof actual !== 'object' || typeof expected !== 'object') {
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

function test (isGroup, mode, description, callback, ...children) {
	if (mode === 'only') {
		isRestricted = true;
	}

	const [parent] = stack;
	const { mode: parentMode, heading: parentHeading, update } = parent[1];
	mode = mode ?? parentMode;
	const heading = parentHeading + 1;
	const container = ['', null];
	const node = [component, { mode, heading, description, update }, ...children, container];
	parent[parent.length - 1].push(node);

	if (isGroup) {
		node[1].update = () => {
			const nodes = container[0];
			
			for (const { className } of nodes) {
				switch (className) {
					case 'failure': {
						status = false;
						reject?.('');
						break;
					}
					case 'pending': {
						return;
					}
				}
			}

			status = true;
			resolve?.('');
		};

		stack.unshift(node);
		callback();
		stack.shift();
		let status = null;
		let resolve, reject;

		callback = () => new Promise((...params) => {
			[resolve, reject] = params;

			if (status === false) {
				reject('');
			} else if (status === true) {
				resolve('');
			}
		});
	}

	node[1].callback = callback;
	return node;
}

const root = (...params) => test(false, null, ...params);
root.skip = (...params) => test(false, 'skip', ...params);
root.only = (...params) => test(false, 'only', ...params);
root.group = (...params) => test(true, null, ...params);
root.group.skip = (...params) => test(true, 'skip', ...params);
root.group.only = (...params) => test(true, 'only', ...params);

root.equals = (actual, ...rest) => {
	if (!rest.length) {
		return new Expected(actual);
	}

	const [expected] = rest;
	const mismatch = compare(expected, actual);
	
	if (mismatch) {
		throw mismatch;
	}
};

export default root;
