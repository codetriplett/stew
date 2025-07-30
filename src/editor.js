import { extractData, FormField } from './form';
import { extractCode } from './code';
import Sidebar from './sidebar';
import state, { library } from '.';

async function putFile (path, body, isCommit) {
	const method = /\S/.test(body) ? 'PUT' : 'DELETE';
	const { readonly } = flags;

	if (isCommit && !readonly) {
		const res = await fetch(path, { method, body });

		if (!res.ok) {
			throw `Unsuccessful ${method}: ${path}`;
		}
	} else if (method === 'DELETE') {
		localStorage.removeItem(path);
	} else {
		localStorage.setItem(path, body);
	}
}

function clear (path) {
	localStorage.removeItem(`/${path}.md`);
	localStorage.removeItem(`/${path}.mjs`);
	localStorage.removeItem(`/${path}.json`);
}

async function save (path, formRef, textareaRef, isCommit, skipReload) {
	const { readonly } = flags;
	const file = textareaRef[0][0].value;
	const code = extractCode(file, library);
	const data = formRef ? extractData(formRef[0][0]) : {};

	if (!data) {
		return;
	}

	await Promise.all([
		putFile(`/${path}.md`, file, isCommit),
		code && putFile(`/${path}.mjs`, code, isCommit),
		putFile(`/${path}.json`, Object.keys(data).length ? JSON.stringify(data) : '', isCommit),
	]);

	if (!isCommit) {
		// state.isEditing = false;
	} else if (!readonly) {
		clear(path);
	}

	state.data = data; // should this just be updated on sequence[0], since it has to reprocess that anyway?
	state.revision++;

	if (!skipReload) {
		window.location.reload();
	}
}

function resizeTextarea (ref) {
	const { scrollX, scrollY } = window;
	const [textarea] = ref[0];
	textarea.style.height = '0px';
	const { scrollHeight } = textarea;
	textarea.style.height = `${scrollHeight}px`;
	window.scrollTo(scrollX, scrollY);
}

function insert (ref, symbol) {
	const [textarea] = ref[0];
	let { value, selectionStart, selectionEnd } = textarea;
	let [, before, slice, after] = value.slice(selectionStart, selectionEnd).match(/^(\s*)([\s\S]*?)(\s*)$/);
	before = `${value.slice(0, selectionStart)}${before}`;
	after += value.slice(selectionEnd);
	textarea.focus();

	if (!slice) {
		switch (symbol) {
			case '#':
			case '-': {
				const match = before.match(new RegExp(`^([\\s\\S]*[\\r\\n])?([${symbol}]* *)$`));

				if (match) {
					[, before = '', slice] = match;
					symbol = `${symbol}${slice.trim()} `;
					selectionEnd += symbol.length - slice.length - 1;
				}

				break;
			}
		}

		slice = symbol;
		selectionStart = selectionEnd += 1;
		symbol = '';
	}

	switch (symbol) {
		case '#':
		case '-': {
			if (slice[0] !== symbol) {
				slice = ` ${slice}`;
				selectionEnd += 1;
			} else if (symbol === '-') {
				const [, dashes, space, text] = slice.match(/^-(-*)(\s*)(.*?)$/);

				if (text) {
					slice = `~~${dashes}${text}~~`;
					selectionEnd += 3 - space.length;
				} else {
					slice += '-';
					selectionStart = selectionEnd += 1;
				}

				break;
			}

			slice = `${symbol}${slice}`;
			selectionEnd += 1;
			break;
		}
		case '`': {
			if (slice.indexOf('\n') !== -1) {
				slice = `\`\`\`\n${slice}\n\`\`\``;
				selectionEnd = selectionStart += 3;
				break;
			}
		}
		case '|':
		case '*':
		case ':': {
			slice = `${symbol}${slice}${symbol}`;
			selectionEnd += symbol.length * 2;
			break;
		}
		case '[](/)': {
			slice = `[${slice}](/)`;
			selectionStart = selectionEnd += 4;
			break;
		}
	}

	value = `${before}${slice}${after}`;
	Object.assign(textarea, { value, selectionStart, selectionEnd });
}

export default function Editor ({ path, file, schema, isModule }) {
	const { data } = state;
	let formRef, textareaRef;
	stew(null, [], () => resizeTextarea(textareaRef));

	return ['', null,
		[Sidebar, { icon: 'menu', hideContent: true },
			!!schema && Object.keys(schema).length > 0 && (formRef = ['', null, ['form', {
				'': 'form',
				onsubmit: event => event.preventDefault(),
			},
				FormField(schema, data),
			]]),
		],
		['div', { className: 'main' },
			['div', { className: 'paper' },
				['div', {
					className: 'toolbar',
				},
					['div', {
						className: 'toolbar-centered',
					},
						['button', {
							type: 'button',
							className: 'toolbar-button hash-button',
							onclick: () => insert(textareaRef, '#'),
						}],
						['button', {
							type: 'button',
							className: 'toolbar-button dash-button',
							onclick: () => insert(textareaRef, '-'),
						}],
						['button', {
							type: 'button',
							className: 'toolbar-button tick-button',
							onclick: () => insert(textareaRef, '`'),
						}],
						['button', {
							type: 'button',
							className: 'toolbar-button link-button',
							onclick: () => insert(textareaRef, '[](/)'),
						}],
						['button', {
							type: 'button',
							className: 'toolbar-button pipe-button',
							onclick: () => insert(textareaRef, '|'),
						}],
						['button', {
							type: 'button',
							className: 'toolbar-button star-button',
							onclick: () => insert(textareaRef, '*'),
						}],
						['button', {
							type: 'button',
							className: 'toolbar-button colon-button',
							onclick: () => insert(textareaRef, ':'),
						}],
					],
				],
				textareaRef = ['', null, ['textarea', {
					'': 'textarea',
					className: isModule ? 'textarea-code' : '',
					placeholder: '(empty)',
					spellcheck: false,
					onkeydown: event => {
						const { key, ctrlKey } = event;

						if (key === 'Tab') {
							event.preventDefault();
							const [textarea] = textareaRef[0];
							const { value, selectionStart, selectionEnd } = textarea;
							textarea.value = `${value.slice(0, selectionStart)}\t${value.slice(selectionEnd)}`;
							textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
						} else if (key === 's' && ctrlKey) {
							event.preventDefault();
							save(path, formRef, textareaRef, !flags.readonly, true);
							return;
						}

						resizeTextarea(textareaRef);
						// state.isChanged = true;
					},
					onkeyup: () => {
						resizeTextarea(textareaRef);
						// state.isChanged = true;
					},
				}, file]],
				['button', {
					type: 'button',
					className: 'right-button save-button',
					onclick: () => save(path, formRef, textareaRef, !flags.readonly),
				}],
				// NOTE: the version of save that pushes to server will exist on the home page
				// - it will resemble staging changes for commit like GIT
				// - additional sync features can be added in the future as well (e.g. set new origin domain for GET, PUT, DELETE, and POST)
			],
		],
	];
}
