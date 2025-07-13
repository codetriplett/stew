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
	state.settings = Object.assign({}, settings, updates);
	packSettingsAndSessions();
}

function addSnips (...newSnips) {
	const { snips } = state;
	let wasAdded = false;
	updateSettings({ showSnips: true });

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

	return file ? Promise.resolve(file) : fetch(path).then(res => {
		return res.ok ? res.text() : '';
	});
}

function fetchData (path) {
	path = `/${path}.json`;
	const file = localStorage.getItem(path);

	return file ? Promise.resolve(JSON.parse(file)) : fetch(path).then(res => {
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
					type: 'button',
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
function LeftMenu ({ map = {}, root, isEligible }, navigation) {
	const { focusedSection, settings } = state;
	const { showMenu } = settings;
	const menuActive = isEligible && showMenu;
	
	stew(null, [menuActive], () => {
		const { classList } = document.body;

		if (menuActive) {
			classList.add('menu-active');
		} else {
			classList.remove('menu-active');
		}
	});

	if (!menuActive) {
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
							type: 'button',
							className: 'citation-button',
							onclick: () => {
								const [path, ...hashes] = href.split('#');
								addSnips(...hashes.map(hash => `${path}#${hash}`));
							},
						}, text],
					];
				}),
			],
			navigation.length > 2 && ['div', null,
				['template', { shadowrootmode: 'open' }, navigation],
			],
		],
	];
}

function Citation ({ snip }) {
	const [path] = snip.replace(/^\/+/, '').split('#');
	const markdown = stew(fetchNote, [path], undefined);
	let content = typeof markdown !== 'string' ? markdown : markdown ? stew(markdown, [snip]) : ['p', null, `File not found: /${path}.md`];

	if (content && Object.keys(content[1] || {}).length === 1) {
		content = ['p', null, `Section not found: ${snip}`];
	}

	return content && ['div', {
		className: 'snip',
	},
		['button', {
			type: 'button',
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
		}],
		content,
	];
}

function RightMenu ({ isEligible }) {
	const { snips, settings } = state;
	const { showSnips } = settings;
	const snipsActive = isEligible && showSnips;
	
	stew(null, [snipsActive], () => {
		const { classList } = document.body;

		if (snipsActive) {
			classList.add('snips-active');
		} else {
			classList.remove('snips-active');
		}
	});

	if (!snipsActive) {
		sideColumns[1] = null;
		return;
	}

	const content = snips.map(snip => [Citation, { '': snip, snip }]);
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

function Block ({ names, data, resources, breadcrumbs, navigation }, content) {
	const isModule = !!resources;
	const path = names.join('/');

	if (isModule) {
		try {
			const [Component, schema, ...blockResources] = stew(fetchCode, [path], {}).default || [];
			content = Component && data !== undefined ? Component(data, content, navigation) : undefined;
			resources.unshift(...blockResources);

			if (schema && data !== null) {
				const heading = schema[''];
				breadcrumbs.unshift(['a', { href: `/${path}` }, heading]);
			}
		} catch (err) {
			// TODO: render error with red text (another theme color var?)
			// - do the same for failed markdown formatters
			content = null;
			console.error(err);
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
							type: 'button',
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
	data = stew(fetchData, [path, isModule && state.revision], undefined);
	return Block({ names, data, resources, breadcrumbs, navigation }, content);
}

function resizeTextarea (ref) {
	const { scrollX, scrollY } = window;
	const [, textarea] = ref;
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
function Editor ({ names, file }) {
	let schema, data;

	if (names.length > 2 || names.length === 2 && names[0] !== 'index') {
		schema = stew(fetchCode, [names.slice(0, -1).join('/')], {}).default?.[1];
		data = stew(fetchData, [names.join('/'), state.revision], undefined);

		if (!schema || !data) {
			return;
		}
	}

	const formRef = [];
	stew(null, [], () => resizeTextarea(formRef));

	return ['div', {
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
					onclick: () => insert(formRef, '#'),
				}],
				['button', {
					type: 'button',
					className: 'toolbar-button dash-button',
					onclick: () => insert(formRef, '-'),
				}],
				['button', {
					type: 'button',
					className: 'toolbar-button tick-button',
					onclick: () => insert(formRef, '`'),
				}],
				['button', {
					type: 'button',
					className: 'toolbar-button link-button',
					onclick: () => insert(formRef, '[](/)'),
				}],
				['button', {
					type: 'button',
					className: 'toolbar-button pipe-button',
					onclick: () => insert(formRef, '|'),
				}],
				['button', {
					type: 'button',
					className: 'toolbar-button star-button',
					onclick: () => insert(formRef, '*'),
				}],
				['button', {
					type: 'button',
					className: 'toolbar-button colon-button',
					onclick: () => insert(formRef, ':'),
				}],
			],
		],
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
		// TODO: add a delete icon to replace save when file is empty
		// TODO: add a sync icon if there aren't any changes made yet
		// - will use another domain to POST and get (configured on home page)
		// - GET with // appended to path to get info (put timestamp on '' prop), then either POST if this version is newer, or update localStorage with newer one
		// - provide warning that newer version will overwrite your draft
		// - similar warnings should be given for save and delete if your version is newer than the one it finds
		!flags.readonly && ['button', {
			type: 'button',
			className: 'left-button save-button',
			onclick: () => save(names, formRef, true),
		}],
		// TODO: only store to localStorage if it differs from what last saved
		// - have save store add the committed draft to the state so it can be checked here
		// - clear from local storage if draft is empty when previewing
		['button', {
			type: 'button',
			className: 'right-button preview-button',
			onclick: () => save(names, formRef),
		}],
	];
}

// TODO: have index.md hold emoji nad formatter
// - emoji are already stored in index.json, so index.md should be how that gets authored
// - don't use index.json as schema, like it does for all other pages
// - have H1 store the formatter function
// - have inline CSS override tool styles (e.g. custom themes)
// - can also use resources section to impore React if people prefer

// TODO: clean up UI now that MD MJS and JSON return empty content instead of 404

function Page () {
	// TODO: check why this sometimes doesn't rerender when isEditing changes
	// - I noticed it when the Block component rendered with an error, but is in try/catch
	// - when it happens, the impulse become unresponsive to any change
	// - it's almost like it fails to subscribe on a render and loses its ability to refresh (how could that happen?)
	const { isEditing, canvas, snips, settings, revision } = state;
	const { showMenu, showSnips } = settings;

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

	if (isComposite) {
		// TODO: if composite fetch and process all columns and combine into one
		// - merge sections across documents into rows if they share the same id (and parents share the same ids)
		// - maybe don't allow editing for composite, and make breadcrumbs list all column names as last item
	}

	const [path] = paths;
	const markdown = stew(fetchNote, [path, revision], undefined);

	// TODO: consider having stew interrupt render by throwing some non-error value
	// - how would this work, it would need some kind of wrapper that adds a try/catch
	// - I'm guessing its better the way I have it, with an initial and fallback value instead, and a custom check to return early
	if (markdown === undefined) {
		return;
	}

	stew(null, [], () => {
		if (typeof markdown === 'string' && !/\S/.test(markdown)) {
			state.isEditing = true;
		}
	});

	if (isEditing) {
		console.log(markdown);
		return [Editor, { names, file: markdown }];
	}

	const content = stew(markdown, [path]);
	const map = content?.[1];
	const resources = map && map[''].indexOf(':') !== -1 ? [] : undefined;
	const data = resources ? null : undefined;

	// TODO: if note is detected as a module, process it without passing params
	// - components should check for props and provide an alternate, landing layout if its missing

	// stew(null, [markdown], () => {
	// 	if (names.length === 2 && names[0] === 'index') {
	// 		const index = markdown.search(/[\r\n]/);
	// 		const text = markdown.slice(0, index > 0 ? index : markdown.length).trim();
	// 		updateSettings({ [names[1]]: text });
	// 	}
	// });

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

	const includeSnips = snips.length > 0;
	const breadcrumbs = [root[1] || names[names.length - 1]];
	const navigation = ['', null];
	const blockContent = Block({ names, breadcrumbs, resources, data, navigation }, ['main', null, content]);
	const includeMenu = root[0].indexOf('#') !== -1 || navigation.length > 2;

	return ['', {},
		// TODO: store array in state for index links that could wrap the left menu links
		// - these are ones that the parents might store in schema['']
		// - allows for creating left nav links that expand to show content for child pages
		[LeftMenu, { map, root, isEligible: includeMenu }, navigation],
		['div', {
			className: 'main',
		},
			blockContent,
			includeMenu ? ['button', {
				type: 'button',
				className: 'left-button menu-button',
				onclick: () => updateSettings({ showMenu: !showMenu }),
			}] : canvas && ['button', {
				type: 'button',
				className: 'left-button fullscreen-button',
				onclick: () => canvas.requestFullscreen(),
			}],
			// TODO: have this be a toggle for snips
			// - put edit button next to name in final breadcrumb (just pencil without filled in circle)
			// - this works better for how mobile will have the left and right content slide in from the side when these buttons are pressed
			// - it also allows for a more focused view of the page while keeping the snips in teh background for quick reference
			// - open the right nav whenever a new snip is added though
			includeSnips && ['button', {
				type: 'button',
				className: 'right-button snips-button',
				onclick: () => updateSettings({ showSnips: !showSnips }),
			}],
		],
		// TODO: if on home page, have right menu show past sessions to resume
		// - first link will be for the page to navigate to, remaining links will be for snips to load
		// - include option to clone active session
		// - also show files that have been changed but not yet saved
		[RightMenu, { isEligible: includeSnips }],
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
					href: `${path}${name}`,
					className: 'child-button',
				}, name],
			];
		}),
	];
}

function Drafts ({ paths, isEligible }) {
	const { settings } = state;
	const { showDrafts } = settings;
	const filesActive = isEligible && showDrafts;
	
	stew(null, [filesActive], () => {
		const { classList } = document.body;

		if (filesActive) {
			classList.add('files-active');
		} else {
			classList.remove('files-active');
		}
	});

	if (!showDrafts) {
		sideColumns[0] = null
		return;
	}

	const tree = stew(() => {
		// TODO: create tree
		const tree = { '': [] };

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

// TODO: add a link in the breadcrumb area with the current date
// - clicking on it will take you to the note for the current day, e.g. 20250709
function Home () {
	const { settings, snips } = state;
	const { theme, showDrafts } = settings;

	// console.log(snips);

	const paths = stew(() => {
		return Object.keys(localStorage).filter(name => /^\/(?!\/).*\.(md|json)$/.test(name));
	}, []);

	const quest = stew(async () => {
		const date = new Date();
		const dateText = date.toDateString();
		const year = date.getFullYear();
		const month = String(date.getMonth() + 101);
		const day = String(date.getDate() + 100);
		const path = `/index/${year}${month.slice(1)}${day.slice(1)}`;
		const markdown = await fetchNote(path.slice(1));
		const summary = stew(markdown, [`${path}#`]) || ['', null];
		
		if (typeof summary[2]?.[0] === 'number') {
			summary.splice(2, 1);
		}

		if (summary.length > 2) {
			summary.push(['hr']);
		}

		summary.splice(2, 0, ['a', { href: path, className: 'date-link' }, dateText]);
		return summary;
	}, [], null);

	const includeDrafts = paths.length > 0;
	
	return ['', {},
		// TODO: render drafts in left menu
		[Drafts, { paths, isEligible: includeDrafts }],
		['div', {
			className: 'main',
		},
			quest,
			stew(`
# Make\u00A0a\u00A0note. Build\u00A0your\u00A0space.

This site serves as a place to store and browse your notes. 
It also supports embedded code to create web apps and games. 
A version will be available soon to download and use offline. 

## Make

Notes are created by navigating to any URL you wish. 
Everything on this demo site is stored in your browser cache, so avoid clearing it if you want to keep them. 
A shortcut to the current day's note can be found at the top of this page, and a menu of all your other notes can be toggled using the icon to its left. 
Emoji and formatters can be set by editing the [index note](/index). 
Learn more about what features are available in the [Markdown guide](/markdown). 

## Explore

A left navigation will be created automatically from the headings in your notes. 
It can be toggled using the icon menu in the upper left of those pages. 
Clicking on headings in that list will focus in on their content, and clicking it again will open a snip. 
Focused sections will also display the links to other notes, or sections if a hash is included, and clicking them will also open a snip. 
Snips are sections of your notes that persist in the right panel as you browse. 
They can be toggled using the hash icon in the upper right of your notes. 

## Build (in development)

Notes with embedded code before the main heading will be treated as modules. 
Modules wrap their nested notes in additional functionality, and can even export their features to other modules. 
The embedded code above the main heading will set the types of data it can accept, and styles to apply, while the code after the main heading will be used as the main layout component. 
Code is set using preformatted text, but only ones that use the \`export\` format. 
You can read more about how the layouts are defined in the [Stew guide](/stew). 
There is even a shader language for creating games that can be found in the [WebGL guide](/webgl). 
			`, ['/']),
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
			includeDrafts && ['button', {
				type: 'button',
				className: 'left-button files-button',
				onclick: () => updateSettings({ showDrafts: !showDrafts }),
			}],
			['button', {
				type: 'button',
				className: 'right-button theme-button',
				onclick: () => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' }),
			}],
		],
		// TODO: have right menu show past sessions to resume
		// - first link will be for the page to navigate to, remaining links will be for snips to load
		// - include option to clone active session
		// - also show files that have been changed but not yet saved
	];
}

function App () {
	const { settings } = state;
	const { theme } = settings;

	stew(null, [theme], () => {
		const { readonly } = flags;
		document.body.className = `${theme}-theme ${pathname === '/' ? 'home' : 'page'} ${readonly ? 'readonly' : ''}`;
	});

	return [pathname === '/' ? Home : Page];
}

fetchCode('index').then(customModule => {
	stew('#app', customModule, [App]);
}).catch(err => {
	console.error(err);
	stew('#app', {}, [App]);
});
