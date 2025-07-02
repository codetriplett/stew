import { extractData, FormField } from './form';
import { extractCode } from './code';

const { localStorage, location } = window;
const { pathname, hash } = location;
const styles = document.querySelector('#styles').textContent;
let emoji, intro;

const state = stew({
	focusedSection: hash.slice(1),
	isEditing: pathname.endsWith('//'),
	settings: {},
	snips: [],
	sessions: [],
	canvas: null,
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
	updateSettings({ hideSnips: false });

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

async function save (names, ref, isCommit) {
	const { readonly } = flags;
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

	if (!isCommit) {
		state.isEditing = false;
	} else if (!readonly) {
		clear(path);
	}

	state.revision++;
}

function fetchNote (path) {
	path = `/${path}.md`;
	const file = localStorage.getItem(path);

	return file || fetch(path).then(res => {
		return res.ok ? res.text() : '';
	}).then(text => {
		return text || fetch('/index.md').then(res => {
			return res.ok ? res.text() : '';
		}).then(text => {
			intro = stew(text, ['/#', emoji]);
			return '';
		});
	});
}

function fetchData (path) {
	path = `/${path}.json`;
	const file = localStorage.getItem(path);

	return file ? JSON.parse(file) : fetch(path).then(res => {
		return res.ok ? res.json() : {};
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

// TODO: see if markdown parser can process these links beforehand
// - have them just set a single child with the string
// - then this function can be removed
function getText (node) {
	if (typeof node === 'string') {
		return node;
	}

	return node[0] === 'br' ? ' ' : node.slice(2).map(getText).join('');
}

// TODO: if map is for a navigation node (all links), show the nav items for the currently active page
// - need to add a focusedPage in addition to focused section
// - on hashchange check if id is for a focusedPage and update it, otherwise update focusedSection
function LeftMenu ({ map = {}, root }, themeToggle) {
	const { focusedSection, settings, navigation } = state;
	const { hideMenu } = settings;

	if (hideMenu) {
		sideColumns[0] = null;
		return;
	}

	stew(null, [window.location.hash], updateWidths);
	const citations = focusedSection && map[focusedSection]?.slice?.(2) || [];
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
	const markdown = stew(fetchNote, [path], null);
	let content = typeof markdown !== 'string' ? markdown : markdown ? stew(markdown, [snip, emoji], null) : ['p', null, `File not found: /${path}.md`];

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
					packSettingsAndSessions();
				}
			},
		}, '✕'],
		content,
	];
}

function RightMenu ({ emoji }) {
	const { snips, settings } = state;
	const { hideSnips } = settings;

	if (hideSnips) {
		sideColumns[1] = null;
		return;
	}

	const content = snips.map(snip => [Citation, { '': snip, snip, emoji }]);
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
			const heading = schema[''];
			breadcrumbs.unshift(['a', { href: `/${path}` }, heading]);
		}
	} else {
		resources = [];
	}

	if (names.length < 2) {
		if (content) {
			const ref = [];

			stew(null, [], () => {
				scrollTo(hash, 'instant');
				state.canvas = ref[0] || null;
			});

			if (content[2]?.[0] === 'canvas') {
				if (content[0] === '') {
					content[0] = 'div';
				}

				if (!content[1]) {
					content[1] = {};
				}

				content[1].ref = ref;
			}
		}

		return ['', null,
			['ul', { className: 'breadcrumbs' }, 
				['li', null,
					['a', { href: '/' }, 'Home'],
				],
				...breadcrumbs.map(breadcrumb => {
					return ['li', null,
						breadcrumb,
						typeof breadcrumb === 'string' && ['button', {
							className: 'edit-button',
							onclick: () => state.isEditing = true,
						}, '🖉'],
					];
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
	data = stew(fetchData, [path, isStart && state.revision], null, {});
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
	const { isEditing, canvas, snips, settings, revision } = state;
	const { hideMenu, hideSnips } = settings;

	const [names, fallback, ...paths] = stew(() => {
		const { pathname } = window.location;
		const names = [];

		const paths = pathname.replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, m => {
			return `/${Array(m.length - 1).fill('.').join('')}/`
		}).split(/\/(?=\.+\/)/);

		if (!pathname.startsWith('//')) {
			names.push(...paths.shift().split('/'));
			paths.unshift(names[names.length - 1]);
		}

		const heading = names[names.length - 1].replace(/-+/g, ' ').trim();
		const fallback = `# ${heading.replace(/(^|\s)[a-z]/g, m => m.toUpperCase())}`;
		paths[0] = `./${paths[0]}`;

		return [names, fallback, ...paths.map(path => {
			const [dots, ...rest] = path.split('/');
			const { length } = dots;
			names.splice(-length, length, ...rest);
			return names.join('/');
		})];
	}, []);

	const isComposite = paths.length > 1;

	if (isComposite) {
		// TODO: if composite fetch and process all columns and combine into one
		// - merge sections across documents into rows if they share the same id (and parents share the same ids)
		// - maybe don't allow editing for composite, and make breadcrumbs list all column names as last item
	}

	const [path] = paths;
	const markdown = stew(fetchNote, [path, revision], null);

	if (isEditing) {
		return typeof markdown === 'string' ? [Editor, { names, file: markdown }] : fallback;
	}

	const content = markdown ? stew(markdown, [path, emoji], null) : intro;
	const map = content?.[1];

	// either map[''] or the array of its only child, with root links prepended
	const root = stew(() => {
		if (!map) {
			return [''];
		}

		const { '': hash, ...sections } = map;
		const children = hash.split('#').slice(1);

		if (children.length !== 1) {
			return [hash, ''];
		}

		return sections[children[0]];
	}, [map]);

	// TODO: have content be a textarea with the markdown file as value while in editing mode
	// - set formRef on textarea
	// - see how stew code would look with '' serving as ref if array is passed [id, ...refs]

	const includeMenu = root[0].indexOf('#') !== -1;
	const includeSnips = snips.length > 0;
	const breadcrumbs = [];

	if (content) {
		breadcrumbs.push(root[1] || names[names.length - 1]);
	}

	return ['', {},
		// TODO: store array in state for index links that could wrap the left menu links
		// - these are ones that the parents might store in schema['']
		// - allows for creating left nav links that expand to show content for child pages
		includeMenu && [LeftMenu, { map, root }],
		['div', {
			className: 'main',
		},
			Block({ names, breadcrumbs }, ['main', null, content]),
			includeMenu ? ['button', {
				className: 'left-button menu-button',
				onclick: () => updateSettings({ hideMenu: !hideMenu }),
			}, '≡'] : canvas && ['button', {
				className: 'left-button fullscreen-button',
				onclick: () => canvas.requestFullscreen(),
			}, '⛶'],
			// TODO: have this be a toggle for snips
			// - put edit button next to name in final breadcrumb (just pencil without filled in circle)
			// - this works better for how mobile will have the left and right content slide in from the side when these buttons are pressed
			// - it also allows for a more focused view of the page while keeping the snips in teh background for quick reference
			// - open the right nav whenever a new snip is added though
			includeSnips && ['button', {
				className: 'right-button snips-button',
				onclick: () => updateSettings({ hideSnips: !hideSnips }),
			}, '#'],
		],
		// TODO: if on home page, have right menu show past sessions to resume
		// - first link will be for the page to navigate to, remaining links will be for snips to load
		// - include option to clone active session
		// - also show files that have been changed but not yet saved
		includeSnips && [RightMenu, { emoji }],
	];
}

function alphabetizeFolder (folder) {
	const { '': files, ...folders } = folder;
	const copy = { '': files.sort() };

	for (const name of Object.keys(folders).sort()) {
		copy[name] = alphabetizeFolder(folder[name]);
	}

	return copy;
}

function Folder (folder, path = '/') {
	const { '': files, ...folders } = folder;

	return ['ul', { className: 'children' },
		...Object.entries(folders).map(([name, folder]) => {
			return ['li', null,
				['span', { className: 'child-button' }, `${name}/`],
				Folder(folder, `${path}${name}/`),
			];
		}),
		...files.map(name => {
			return ['li', null,
				['a', {
					href: `${path}${name}//`,
					className: 'child-button',
				}, name],
			];
		}),
	];
}

function Drafts () {
	const tree = stew(() => {
		// TODO: create tree
		const paths = Object.keys(localStorage).filter(name => /^\/(?!\/).*\.(md|json)$/.test(name));
		const tree = { '': [] };
		
		if (!paths.length) {
			return;
		}

		for (const path of paths) {
			const names = path.slice(1).split('/');
			const filename = names.pop().replace(/\.(md|json)$/, '');

			const folder = names.reduce((folder, name) => {
				if (!folder[name]) {
					folder[name] = { '': [] };
				}

				return folder[name];
			}, tree);

			if (folder[''].indexOf(filename) === -1) {
				folder[''].push(filename);
			}
		}

		return alphabetizeFolder(tree);
	}, []);

	if (!tree) {
		sideColumns[0] = null
		return;
	}

	stew(null, [window.location.hash], updateWidths);
	sideColumns[0] = [];

	return ['div', {
		className: 'nav',
		ref: sideColumns[0],
	},
		['div', {
			className: 'scroll-column',
			ref: sideColumns[0],
		}, Folder(tree)],
	];
}

function Home () {
	const { settings } = state;
	const { theme,  } = settings;
	const markdown = stew(fetchNote, ['index'], '');
	const layout = stew(markdown, ['/#'], null);
	
	return ['', {},
		// TODO: render drafts in left menu
		[Drafts],
		['div', {
			className: 'main',
		},
			layout,
			// TODO: render active snips session here
			// - display inactive ones to the side, along with a button to create a new session
			// - ones to the side can be clicked to make active or closed
			// - Include a field to rename the active session when it is active, and a close button

			// TODO: toggle between info and hashmap mode
			// - store references in .txt file that matches name of .md file
			// - lines that start with # mark the sections within the note
			// - lines that start with / are links within the section
			// - one link for each unique path, with composite hash of all sections it points to
			// ['button', {
			// 	type: 'button',
			// 	className: 'left-button map-button',
			// 	onclick: () => {
			// 		console.log('==== toggle hash map');
			// 	},
			// }, '#'],
			['button', {
				type: 'button',
				className: 'right-button theme-button',
				onclick: () => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' }),
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

	emoji = stew(fetchData, ['index'], null, {});
	const formatter = stew(fetchCode, ['index'], null, {});

	if (emoji === null || formatter === null) {
		return;
	}

	emoji[''] = formatter.default;
	return [Page, { emoji }];
}
