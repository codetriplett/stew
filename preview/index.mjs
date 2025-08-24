export function capitalize () {
	const [flags, code] = arguments;
	const { all } = flags;
	return ['p', null, all ? code.toUpperCase() : `${code[0]}${code.slice(1)}`];
}

export function render () {
	const [flags, code] = arguments;
	return new Function(code);
}

export function demo () {
	const [{ markdown }, code] = arguments;

	const lines = markdown ? [code] : code.split(/\r\n|\r|\n/).map(line => {
	    const [, text, comment] = line.match(/^(.*?)(?:\s*\/\/\s*([+-]))?\s*$/);

	    return ['div', {
	        style: comment && { backgroundColor: comment === '-' ? 'rgba(191, 63, 63, 0.125)' : 'rgba(63, 191, 63, 0.125)' },
	    }, text || ' '];
	});

	return ['div', {
	    className: 'stew-demo',
	    style: { display: 'flex', gap: '16px' },
	},
	    ['style', null, `
	        .stew-demo canvas {
	            width: 100%;
	        }
	        @media (max-width: 720px) {
	            .stew-demo {
	                display: block !important;

	                > *  + * {
	                    margin-top: 16px;
	                }
	            }
	        }
	    `],
	    ['div', {
	        style: { flex: '3 1 0', overflowX: 'auto', fontFamily: 'monospace', whiteSpace: 'pre' },
	    },
	        ...lines,
	    ],
	    ['div', {
	        style: { flex: '2 1 0', overflowX: 'auto', padding: '16px', background: 'var(--page-background)' },
	    }, markdown ? stew(code, ['/']) : new Function(code)],
	];
}

export default [null, {
    '': 'quest',
    smile: '🙂',
}];
