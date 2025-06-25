import { extractData, FormField } from './form';
import { extractCode } from './code';

const { localStorage, location } = window;
const { pathname, hash } = location;
const styles = document.querySelector('#styles').textContent;

const state = stew({
	focusedSection: hash.slice(1),
	isEditing: false,
	settings: {},
	snips: [],
	sessions: [],
	sessionIndex: 0,
	revision: 0,
});

function packSettingsAndSessions () {
	const { snips, settings, sessions, sessionIndex } = state;
	const session = sessions[sessionIndex] || ['', null];
	session.splice(2, session.length, ...snips);
	sessions.splice(sessionIndex, 1, session);
	const value = [sessionIndex, settings, ...sessions];
	localStorage.setItem('/', JSON.stringify(value));
}

function unpackSettingsAndSessions () {
	let value;

	try {
		value = JSON.parse(localStorage.getItem('/'));
	} catch (err) {
	}

	if (!Array.isArray(value)) {
		value = [0, typeof value === 'object' && value || {}];
	}

	const [sessionIndex, settings, ...sessions] = value;
	const session = sessions[sessionIndex] || [];
	const snips = session.slice(2);
	Object.assign(state, { snips, settings, sessions, sessionIndex });
}

function updateSettings (updates) {
	const { settings } = state;
	state.settings = { ...Object.assign(settings, updates) };
	packSettingsAndSessions();
}

function addSnips (...newSnips) {
	const { snips } = state;
	let wasAdded = false;

	for (const snip of newSnips) {
		const index = snips.indexOf(snip);

		if (index === -1) {
			snips.push(snip);
			wasAdded = true;
		}
	}

	if (wasAdded) {
		state.snips = [...snips];
		packSettingsAndSessions();
	}
}

function scrollTo (hash, behavior) {
	const container = document.querySelector('.main > div');
	let top = 0;

	if (!container) {
		return;
	} else if (hash) {
		const heading = container.shadowRoot.querySelector(hash);

		if (!heading) {
			return;
		}

		const { y = 0 } = heading.getBoundingClientRect();
		top = y + window.scrollY - 15;
	}

    window.scrollTo({ top, behavior });
}

window.addEventListener('pageshow', () => {
	unpackSettingsAndSessions();
});

window.addEventListener('hashchange', () => {
	const { hash } = window.location;
	state.focusedSection = hash.slice(1);
	scrollTo(hash, 'smooth');
});

const sideColumns = [];

function updateWidths () {
	sideColumns.map((column, i) => {
		if (!column) {
			return;
		}

		const [flexContainer, scrollContainer] = column;

		if (i) {
			const width = flexContainer.clientWidth;
			scrollContainer.style.width = `${width}px`;
		} else {
			const width = scrollContainer.clientWidth;
			flexContainer.style.flexBasis = `${width}px`;
		}
	});
}

window.addEventListener('resize', updateWidths);

const originals = {};

async function putFile (path, body, isCommit) {
	// TODO: store originals of MD and JSON when rendering Block
	// - also prevent MJS from saving if MD hasn't changed

	// if (body === original) {
	// 	if (!isCommit) {
	// 		localStorage.removeItem(path);
	// 	}

	// 	return;
	// }

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

async function save (names, ref, isCommit) {
	const [form, textarea] = ref;
	const file = textarea.value;
	const code = extractCode(file);
	const data = extractData(form);
	const path = names.join('/');

	if (!data) {
		return;
	}

	await Promise.all([
		putFile(`/${path}.md`, file, isCommit),
		code && putFile(`/${path}.mjs`, code, isCommit),
		putFile(`/${path}.json`, Object.keys(data).length ? JSON.stringify(data) : '', isCommit),
	]);

	if (isCommit) {
		clear(path);
	} else {
		state.isEditing = false;
	}

	state.revision++;
}

function fetchNote (path) {
	path = `/${path}.md`;
	const file = localStorage.getItem(path);

	return file || fetch(path).then(res => {
		if (!res.ok) {
			throw `Not found: ${path}`;
		}
		
		return res.text()
	});
}

function fetchData (path) {
	path = `/${path}.json`;
	const file = localStorage.getItem(path);

	return file ? JSON.parse(file) : fetch(path).then(res => {
		if (!res.ok) {
			throw `Not found: ${path}`;
		}
		
		return res.json();
	});
}

function fetchCode (path) {
	path = `/${path}.mjs`;
	const file = localStorage.getItem(path);

	return import(!file ? path : URL.createObjectURL(
		new Blob([file], { type: 'application/javascript' }),
	));
}

function LeftMenuList (map, hashes) {
	if (!hashes) {
		return;
	}

	const { hash } = window.location;
	const children = hashes.split('#').slice(1);

	return !children.length ? null : ['ul', {
		className: 'children',
	},
		...children.map(name => {
			const [hashes, text] = name && map[name] || [];
			
			return ['li', null,
				['button', {
					className: `child-button ${name === hash.slice(1) ? 'child-button-active' : ''}`,
					onclick: () => {
						const { hash } = window.location;

						if (name !== hash.slice(1)) {
							window.location.hash = name;
						} else {
							addSnips(`${pathname}${hash}`);
						}
					},
				}, text],
				LeftMenuList(map, hashes),
			];
		}),
	];
}

function getText (node) {
	if (typeof node === 'string') {
		return node;
	}

	return node[0] === 'br' ? ' ' : node.slice(2).map(getText).join('');
}

function LeftMenu ({ map = {}, root }, themeToggle) {
	const { focusedSection, settings } = state;
	const { hideMenu } = settings;

	if (hideMenu) {
		sideColumns[0] = null;
		return;
	}

	stew(null, [window.location.hash], updateWidths);
	const citations = map[focusedSection]?.slice?.(2) || [];
	const [rootHash] = root;
	sideColumns[0] = [];

	return ['div', {
		className: 'nav',
		ref: sideColumns[0],
	},
		['div', {
			className: 'scroll-column',
			ref: sideColumns[0],
		},
			LeftMenuList(map, rootHash),
			citations.length > 0 && ['ul', {
				className: 'citations',
			},
				citations.map(citation => {
					const { href } = citation[1];
					const text = getText(citation);

					return ['li', null,
						['button', {
							className: 'citation-button',
							onclick: () => {
								const [path, ...hashes] = href.split('#');
								addSnips(...hashes.map(hash => `${path}#${hash}`));
							},
						}, text],
					];
				}),
			],
			themeToggle,
		],
	];
}

function Citation ({ snip, emoji }) {
	const [path] = snip.replace(/^\/+/, '').split('#');
	const markdown = stew(fetchNote, [path], '', ['p', null, `File not found: /${path}.md`]);
	let content = typeof markdown === 'string' ? stew(markdown, [snip, emoji]) : markdown;

	if (content && Object.keys(content[1] || {}).length === 1) {
		content = ['p', null, `Section not found: ${snip}`];
	}

	return content && ['div', {
		className: 'snip',
	},
		['button', {
			className: 'right-button close-button',
			onclick: () => {
				const { snips } = state;
				const index = snips.indexOf(snip);

				if (index !== -1) {
					snips.splice(index, 1);
					state.snips = [...snips];
					// TODO: save snips to sessions that can be viewed and picked up again on home page
				}
			},
		}, '✕'],
		content,
	];
}

function RightMenu ({ emoji }) {
	const { snips } = state;
	const content = snips.map(snip => [Citation, { '': snip, snip, emoji }]);

	if (!content.length) {
		sideColumns[1] = null;
		return;
	}

	stew(null, [], updateWidths);
	sideColumns[1] = [];

	return ['div', {
		className: 'snips',
		ref: sideColumns[1],
	},
		['div', {
			className: 'scroll-column',
			ref: sideColumns[1],
		}, ...content]
	];
}

function Block ({ names, data, resources, breadcrumbs }, content) {
	const isStart = !!resources;
	const path = names.join('/');

	if (isStart) {
		const [Component, schema, ...blockResources] = stew(fetchCode, [path], {}).default || [];
		content = Component && data ? Component(data, content) : undefined;
		resources.unshift(...blockResources);

		if (schema) {
			breadcrumbs.unshift(['a', { href: `/${path}` }, schema['']]);
		}
	} else {
		resources = [];
	}

	if (names.length < 2) {
		if (content) {
			stew(null, [], () => scrollTo(hash, 'instant'));
		}

		return ['', null,
			['ul', { className: 'breadcrumbs' }, 
				['li', null,
					['a', { href: '/' }, 'Home'],
				],
				...breadcrumbs.map(breadcrumb => {
					return ['li', null, breadcrumb];
				}),
			],
			['div', null,
				['template', { shadowrootmode: 'open' },
					['style', null, styles],
					...resources,
					content,
				],
			],
		];
	}

	names = names.slice(0, -1);
	data = stew(fetchData, [path, isStart && state.revision], null);
	return Block({ names, data, resources, breadcrumbs }, content);
}

function resizeTextarea (ref) {
	const { scrollX, scrollY } = window;
	const [, textarea] = ref;
	textarea.style.height = '0px';
	const { scrollHeight } = textarea;
	textarea.style.height = `${scrollHeight}px`;
	window.scrollTo(scrollX, scrollY);
}

// TODO: have close button be preview button when change is detected
// - this will save it to local storage and return you to the rendered note
// - have left nav on Home Page show all drafts that haven't been saved
// - have save button clear it from local storage but not return you to rendered note
// - maybe have save button show download link that opens stew NPM page in new tab when in readonly mode
function Editor ({ names, file }) {
	let schema, data;

	if (names.length > 1) {
		schema = stew(fetchCode, [names.slice(0, -1).join('/')], {}).default?.[1];
		data = stew(fetchData, [names.join('/'), state.revision], {});

		if (!schema) {
			return;
		}
	}

	const formRef = [];
	stew(null, [], () => resizeTextarea(formRef));

	return ['div', {
		className: 'edit',
	},
		['form', {
			ref: formRef,
			onsubmit: event => event.preventDefault(),
		},
			schema && FormField(schema, data),
			['textarea', {
				ref: formRef,
				className: 'editor',
				placeholder: '(empty)',
				spellcheck: false,
				onkeydown: event => {
					const { key } = event;

					if (key === 'Tab') {
						event.preventDefault();
						const [, textarea] = formRef;
						const { value, selectionStart, selectionEnd } = textarea;
						textarea.value = `${value.slice(0, selectionStart)}\t${value.slice(selectionEnd)}`;
						textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
					}

					resizeTextarea(formRef);
					// state.isChanged = true;
				},
				onkeyup: () => {
					resizeTextarea(formRef);
					// state.isChanged = true;
				},
			}, file],
		],
		['button', {
			className: 'left-button save-button',
			onclick: () => save(names, formRef, true),
		}, '🖫'],
		['button', {
			className: 'right-button preview-button',
			onclick: () => save(names, formRef),
		}, '👁'],
	];
}

function Page ({ emoji }) {
	const { isEditing, settings, revision } = state;
	const { hideMenu } = settings;

	const [names, ...paths] = stew(() => {
		const { pathname } = window.location;
		const names = [];

		const paths = pathname.replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, m => {
			return `/${Array(m.length - 1).fill('.').join('')}/`
		}).split(/\/(?=\.+\/)/);

		if (!pathname.startsWith('//')) {
			names.push(...paths.shift().split('/'));
			paths.unshift(names[names.length - 1]);
		}

		paths[0] = `./${paths[0]}`;

		return [names, ...paths.map(path => {
			const [dots, ...rest] = path.split('/');
			const { length } = dots;
			names.splice(-length, length, ...rest);
			return names.join('/');
		})];
	}, []);

	const isComposite = paths.length > 1;
	const files = paths.map((path, i) => stew(fetchNote, [path, i || revision], ''));
	// TODO: figure out why revision change triggers two renders, and why first one doesn't show updated file
	// - revision should be waiting until save promise has resolved, and removes localStorage first, so it should fetch most recent

	// TODO: load parent schema
	// - store in memo that returns undefined when not editing (will be done in Block component)
	if (isEditing) {
		return [Editor, { names, file: files[0] }];
	}

	// TODO: create composite from all documents
	// - merge sections across documents into rows if they share the same id (and parents share the same ids)
	const [column] = files.map((file, i) => stew(file, [paths[i], emoji]));
	const content = column && ['main', null, ...column.slice(2)];
	const map = column?.[1];

	// either map[''] or the array of its only child, with root links prepended
	const root = stew(() => {
		if (!map) {
			return [''];
		}

		const { '': root, ...sections } = map;
		const [hash] = root;
		const children = hash.split('#').slice(1);

		if (children.length !== 1) {
			return root;
		}

		const child = [...sections[children[0]]];
		child.splice(2, 0, ...root.slice(2));
		return child;
	}, [map]);

	// TODO: have content be a textarea with the markdown file as value while in editing mode
	// - set formRef on textarea
	// - see how stew code would look with '' serving as ref if array is passed [id, ...refs]

	const includeMenu = root[0].indexOf('#') !== -1;
	const breadcrumbs = [];

	if (map && root !== map['']) {
		breadcrumbs.push(root[1]);
	}

	return ['', {},
		includeMenu && [LeftMenu, { map, root }],
		['div', {
			className: 'main',
		},
			Block({ names, breadcrumbs }, content),
			includeMenu && ['button', {
				className: 'left-button menu-button',
				onclick: () => {
					updateSettings({ hideMenu: !hideMenu });
				},
			}, '≡'],
			['button', {
				className: 'right-button edit-button',
				onclick: () => state.isEditing = true,
			}, '✎'],
		],
		// TODO: if on home page, have right menu show past sessions to resume
		// - first link will be for the page to navigate to, remaining links will be for snips to load
		// - include option to clone active session
		// - also show files that have been changed but not yet saved
		!isEditing && [RightMenu, { emoji }],
	];
}

function Home () {
	const { settings } = state;
	const { theme } = settings;
	const markdown = stew(fetchNote, ['index'], '');
	const layout = stew(markdown, ['/#'], null);
	
	return ['', {},
		// TODO: render drafts in left menu
		['div', {
			className: 'main',
		},
			layout,
			// TODO: render active snips session here
			// - display inactive ones to the side, along with a button to create a new session
			// - ones to the side can be clicked to make active or closed
			// - Include a field to rename the active session when it is active, and a close button

			// TODO: maybe put a sync button here to allow drafts to be pulled from sessionStorage
			// - this fits nicely with drafts in the left column and opens this up to multi device
			['button', {
				type: 'button',
				className: 'right-button theme-button',
				onclick: () => {
					updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' });
				},
			}, theme === 'dark' ? '☽' : '☼'],
		],
		// TODO: have right menu show past sessions to resume
		// - first link will be for the page to navigate to, remaining links will be for snips to load
		// - include option to clone active session
		// - also show files that have been changed but not yet saved
	];
}

export default function App () {
	const { settings } = state;
	const { theme } = settings;
	
	stew(null, [theme], () => {
		const { readonly } = flags;
		document.body.className = `${theme}-theme ${readonly ? 'readonly' : ''}`;
	});

	if (pathname === '/') {
		return [Home];
	}

	const emoji = stew(fetchData, ['index'], null, {});
	const formatter = stew(fetchCode, ['index'], null, {});

	if (emoji === null || formatter === null) {
		return;
	}

	emoji[''] = formatter.default;
	return [Page, { emoji }];
}
