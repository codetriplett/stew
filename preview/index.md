```export
{
	'': 'quest',
	smile: '🙂',
}
```

# Make a note. Build a space.

```render
return ['style', null, `
.flex-links {
	display: flex;
	justify-content: space-around;
	gap: 16px;
	text-align: center;

	a {
		font-size: 21px;
	}
}
`];
```

This site serves as a place to store and browse your notes. 
It also supports embedded code to create web pages and games. 
Everything is stored in your browser, but a downloadable version will also be available in the future. 
Navigate to any URL to get started on a new note, or read on to learn the basics. 

```render
return ['div', { className: 'flex-links' },
    ['div', null,
        ['a', { href: '/markdown' }, 'Markdown'],
        ['p', null, 'Decorates notes with basic HTML.'],
    ],
    ['div', null,
        ['a', { href: '/stew' }, 'Stew'],
        ['p', null, 'Enables custom layouts and interactivity.'],
    ],
    ['div', null,
        ['a', { href: '/webgl' }, 'WebGL'],
        ['p', null, 'Streamlines 2D and 3d graphics.'],
    ],
];
```

Here are some examples of what you can create. 
Each of them can be edited like any other note, so feel free to make it your own. 
You can reset these ones at any time by clearing your local draft and saving. 

```render
return ['div', { className: 'flex-links' },
    ['div', null,
        ['a', { href: '/party/' }, 'Party'],
        ['p', null, 'A basic demo of custom pages with data.'],
    ],
    ['div', null,
        ['a', { href: '/quest/' }, 'Quest'],
        ['p', null, 'A view of your daily quests by season.'],
    ],
    ['div', null,
        ['a', { href: '/cube/' }, 'Cube'],
        ['p', null, 'A 3D puzzle cube to fidget with.'],
    ],
];
```

## Capitalize

```export
const [flags, code] = arguments;
const { all } = flags;
return ['p', null, all ? code.toUpperCase() : `${code[0]}${code.slice(1)}`];
```

## Render

```export
const [flags, code] = arguments;
return new Function(code);
```

## Demo

```export
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
```
