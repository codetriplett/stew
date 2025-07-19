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
	const [form] = formRef;
	const [textarea] = textareaRef;
	const file = textarea.value;
	const code = extractCode(file, library);
	const data = extractData(form);

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

// TODO: have close button be preview button when change is detected
// - this will save it to local storage and return you to the rendered note
// - have left nav on Home Page show all drafts that haven't been saved
// - have save button clear it from local storage but not return you to rendered note
// - maybe have save button show download link that opens stew NPM page in new tab when in readonly mode
export default function Editor ({ path, file, schema }) {
	const { data } = state;
	let formRef, textareaRef;
	stew(null, [], () => resizeTextarea(textareaRef));

	return ['', null,
		[Sidebar, { icon: 'menu' },
			schema && (formRef = ['form', {
				'': 'form',
				onsubmit: event => event.preventDefault(),
			},
				FormField(schema, data),
			]),
		],
		['div', {
			className: 'edit',
		},
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
				className: 'editor',
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
			// TODO: add a delete icon to replace save when file is empty
			// TODO: add a sync icon if there aren't any changes made yet
			// - will use another domain to POST and get (configured on home page)
			// - GET with // appended to path to get info (put timestamp on '' prop), then either POST if this version is newer, or update localStorage with newer one
			// - provide warning that newer version will overwrite your draft
			// - similar warnings should be given for save and delete if your version is newer than the one it finds
			// !flags.readonly && ['button', {
			// 	type: 'button',
			// 	className: 'left-button save-button',
			// 	onclick: () => save(path, formRef, textareaRef, true),
			// }],
			// TODO: only store to localStorage if it differs from what last saved
			// - have save store add the committed draft to the state so it can be checked here
			// - clear from local storage if draft is empty when previewing
			['button', {
				type: 'button',
				className: 'right-button preview-button',
				onclick: () => save(path, formRef, textareaRef),
			}],
		],
	];
}
