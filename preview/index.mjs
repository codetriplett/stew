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
	const [{ markdown, form }, code] = arguments;
	let result;

	if (markdown) {
		result = stew(code, ['/']);
	} else if (form) {
		const schema = new Function(`return ${code}`)();
		result = renderForm(schema, undefined, console.log);
	} else {
		result = new Function(code);
	}

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
			.stew-demo form {
				ul {
					display: flex;
					flex-direction: column;
					gap: 4px;
					padding: 0;
					list-style: none;

					ul,
					ol {
						margin-top: 10px;
						padding-left: 12px;
						border-left: 1px solid var(--paper-font-color);
					}
				}
				input:not([type="checkbox"]),
				textarea,
				select {
					display: block;
					box-sizing: border-box;
					width: 100%;
					margin-top: 4px
				}
				textarea {
					min-height: 51px;
    				resize: vertical;
				}
				input[type="checkbox"] {
					float: left;
					margin-right: 5px;
				}
				.action-button {
					float: right;
				}
				> button:last-child {
					display: none;
				}
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
	    }, result],
	];
}

export default [null, {
    '': 'quest',
    smile: '🙂',
}];
