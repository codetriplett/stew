function layout ({ '': context, description, promise }, ...children) {
	const { heading = 2, states = [] } = context;
	const state = stew({ status: null, message: '' });
	const { status, message } = state;

	stew(() => {
		promise.then(value => {
			const message = typeof value === 'string' ? value : '';
			Object.assign(state, { status: true, message });
		}).catch(err => {
			const message = typeof err === 'string' ? err : err.message;
			Object.assign(state, { status: false, message });
		});
	}, []);

	return ['', { heading: heading + 1, states: [state, ...states] },
		[heading, null,
			status !== null && ['input', { type: 'checkbox', checked: status }],
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

		return `${Array(indentation).fill('    ').join('')}${key ? `${key}: ` : ''}${print(actual)}, // ${print(expected)}`;
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

export function expect (actual) {
	return {
		equals: expected => {
			const delta = compare(expected, actual);

			if (delta) {
				throw delta;
			}
		}
	};
}

const stack = [];

export default function (description, callback, ...children) {
	const [parent] = stack;
	stack.unshift([]);
	const promise = new Promise(resolve => resolve(callback()));

	const node = [layout, { description, promise },
		...children,
		...stack.shift(),
	];

	parent?.push?.(node);
	return node;
}
