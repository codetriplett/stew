import { extractData, FormField } from './form';
import { extractCode } from './code';

const { localStorage, location } = window;
const { pathname, hash } = location;
const styles = document.querySelector('#styles').textContent;
let settings;

// try {
// 	emoji = JSON.parse(localStorage.getItem('/') || '{}');
// } catch (err) {
// 	emoji = {};
// }

const state = stew({
	snips: ['/site/category/other#second', '/site/category/other#zeroth'],
	focusedSection: hash.slice(1),
	isEditing: false,
	settings: {},
	revision: 0,
});

function updateSettings (updates) {
	state.settings = { ...Object.assign(settings, updates) };
	localStorage.setItem('/', JSON.stringify(settings));
}

function scrollTo (hash) {
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

    window.scrollTo({ top, behavior: 'smooth' });
}

window.addEventListener('pageshow', () => {
	try {
		settings = JSON.parse(localStorage.getItem('/') || '{}');
	} catch (err) {
		settings = {};
	}

	state.settings = { ...settings };
});

window.addEventListener('hashchange', () => {
	const { hash } = window.location;
	state.focusedSection = hash.slice(1);
	scrollTo(hash);
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

async function putFile (path, body) {
	const method = !/\S/.test(body) || path.endsWith('.json') && body === '{}' ? 'DELETE' : 'PUT';
	const { readonly } = flags;

	if (!readonly) {
		const res = await fetch(path, { method, body });

		if (!res.ok) {
			throw `Unsuccessful ${method}: ${path}`;
		}
	} else if (method !== 'DELETE') {
		localStorage.setItem(path, body);
		return;
	}
	
	localStorage.removeItem(path);
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

function LeftMenuList (map, hash) {
	if (!hash) {
		return;
	}

	const children = hash.split('#').slice(1);

	return !children.length ? null : ['ul', {
		className: 'children',
	},
		...children.map(name => {
			const [hash, text] = name && map[name] || [];
			
			return ['li', null,
				['button', {
					className: 'child-button',
					onclick: () => {
						window.location.hash = name;
					},
				}, text],
				LeftMenuList(map, hash),
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
	const { focusedSection, snips, settings } = state;
	const { hideMenu } = settings;

	if (hideMenu) {
		sideColumns[0] = null;
		return;
	}

	stew(null, [], updateWidths);
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
								let wasAdded = false;

								for (const hash of hashes) {
									const snip = `${path}#${hash}`;
									const index = snips.indexOf(snip);

									if (index === -1) {
										snips.push(href);
										wasAdded = true;
									}
								}

								if (wasAdded) {
									state.snips = [...snips];
								}
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
				snips.splice(index, 1);
				state.snips = [...snips];
				// storeSession();
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
		// TODO: create function to convert MD to MJS on save
		// - convert styles to ['style', ...] and put as first resource node
		// - convert resource css and js to ['link', ...] and ['script', ...] for the rest
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
			stew(null, [], () => scrollTo(hash));
		}

		return ['', null,
			pathname !== '/' && ['ul', { className: 'breadcrumbs' }, 
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
			onclick: async () => {
				const [form] = formRef;
				const file = form.querySelector('textarea').value;
				const code = extractCode(file);
				const data = extractData(form);
				const path = names.join('/');
				
				await Promise.all([
					putFile(`/${path}.md`, file),
					code && putFile(`/${path}.mjs`, code),
					putFile(`/${path}.json`, JSON.stringify(data)),
				]);

				state.revision++;
			},
		}, '🖫'],
		['button', {
			className: 'right-button close-button',
			onclick: () => state.isEditing = false,
		}, '✕'],
	];
}

function Page ({ emoji }) {
	const { isEditing, settings, revision } = state;
	const { theme, hideMenu } = settings;

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

		paths[0] = `./${paths[0] || 'index'}`;

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
			pathname === '/'
				? ['button', {
					type: 'button',
					className: 'right-button theme-button',
					onclick: () => {
						updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' });
					},
				}, theme === 'dark' ? '☼' : '☽']
				: ['button', {
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

export default function App () {
	const { settings } = state;
	const { theme } = settings;

	const emoji = stew(fetchData, ['index'], null, {});
	const formatter = stew(fetchCode, ['index'], null, {});

	stew(null, [theme], () => {
		const { readonly } = flags;
		document.body.className = `${theme}-theme ${readonly ? 'readonly' : ''}`;
	});

	if (emoji === null || formatter === null) {
		return;
	}

	emoji[''] = formatter.default;
	return [Page, { emoji }];
}
