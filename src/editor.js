import { extractData, FormField } from './form';
import { extractCode } from './code';
import Sidebar from './sidebar';
import state from '.';

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

async function save (path, formRef, textareaRef, isCommit) {
	const { readonly } = flags;
	const file = textareaRef[0].value;
	const code = extractCode(file);
	const data = formRef ? extractData(formRef[0]) : {};

	if (!data) {
		return;
	}

	await Promise.all([
		putFile(`/${path}.md`, file, isCommit),
		code && putFile(`/${path}.mjs`, code, isCommit),
		putFile(`/${path}.json`, Object.keys(data).length ? JSON.stringify(data) : '', isCommit),
	]);

	if (!isCommit) {
		state.isEditing = false;
		window.location.reload();
	} else if (!readonly) {
		clear(path);
	}

	state.data = data; // should this just be updated on sequence[0], since it has to reprocess that anyway?
	state.revision++;
}

function resizeTextarea (ref) {
	const { scrollX, scrollY } = window;
	const [textarea] = ref;
	textarea.style.height = '0px';
	const { scrollHeight } = textarea;
	textarea.style.height = `${scrollHeight}px`;
	window.scrollTo(scrollX, scrollY);
}

function insert (ref, symbol) {
	const textarea = ref[1];
	const { value, selectionStart, selectionEnd } = textarea;
	textarea.focus();
	textarea.value = `${value.slice(0, selectionStart)}${symbol}${value.slice(selectionEnd)}`;
	textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
}

export default function Editor ({ path, file, schema }) {
	const { data } = state;
	let formRef, textareaRef;
	stew(null, [], () => resizeTextarea(textareaRef));

	return ['', null,
		[Sidebar, { icon: 'menu', hideContent: true },
			!!schema && Object.keys(schema).length > 0 && (formRef = ['form', {
				'': 'form',
				onsubmit: event => event.preventDefault(),
			},
				FormField(schema, data),
			]),
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
				textareaRef = ['textarea', {
					'': 'textarea',
					placeholder: '(empty)',
					spellcheck: false,
					onkeydown: event => {
						const { key } = event;

						if (key === 'Tab') {
							event.preventDefault();
							const [, textarea] = textareaRef;
							const { value, selectionStart, selectionEnd } = textarea;
							textarea.value = `${value.slice(0, selectionStart)}\t${value.slice(selectionEnd)}`;
							textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
						}

						resizeTextarea(textareaRef);
						// state.isChanged = true;
					},
					onkeyup: () => {
						resizeTextarea(textareaRef);
						// state.isChanged = true;
					},
				}, file],
				['button', {
					type: 'button',
					className: 'right-button save-button',
					onclick: () => save(path, formRef, textareaRef),
				}],
				// NOTE: the version of save that pushes to server will exist on the home page
				// - it will resemble staging changes for commit like GIT
				// - additional sync features can be added in the future as well (e.g. set new origin domain for GET, PUT, DELETE, and POST)
			],
		],
	];
}
