import { onsubmit, FormField } from './form';

const { localStorage, location } = window;
const { pathname } = location;
const styles = document.querySelector('#styles').textContent;
let settings;

// try {
// 	emoji = JSON.parse(localStorage.getItem('/') || '{}');
// } catch (err) {
// 	emoji = {};
// }

const state = stew({
	snips: ['/site/category/other#second', '/site/category/other#zeroth'],
	focusedSection: '',
	hideMenu: false,
	isEditing: false,
	settings: {},
});

function updateSettings (updates) {
	state.settings = { ...Object.assign(settings, updates) };
	localStorage.setItem('/', JSON.stringify(settings));
}

window.addEventListener('pageshow', () => {
	try {
		settings = JSON.parse(localStorage.getItem('/') || '{}');
	} catch (err) {
		settings = {};
	}

	state.settings = { ...settings };
});

function fetchText (path) {
	const file = localStorage.getItem(path);

	return file || fetch(path).then(res => {
		if (!res.ok) {
			throw `Not found: ${path}`;
		}
		
		return res.text()
	});
}

function fetchJson (path) {
	const file = localStorage.getItem(path);

	return file ? JSON.parse(file) : fetch(path).then(res => {
		if (!res.ok) {
			throw `Not found: ${path}`;
		}
		
		return res.json();
	});
}

function fetchCode (path) {
	const file = localStorage.getItem(path);

	return import(!file ? path : URL.createObjectURL(
		new Blob([file], { type: 'application/javascript' }),
	));
}

function LeftMenuList (map, hash) {
	const children = hash.split('#').slice(1);

	return !children.length ? null : ['ul', {
		className: 'children',
	},
		...children.map(name => {
			const [text, ...rest] = name && map[name] || [];
			const hash = rest.pop();
			
			return ['li', null,
				['button', {
					className: 'child-button',
					onclick: () => {
						state.focusedSection = name;
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

function LeftMenu ({ map = {}, rootHash, rootName }, themeToggle) {
	const { hideMenu, focusedSection, snips } = state;

	if (hideMenu) {
		return;
	}

	const citations = focusedSection && map[focusedSection]?.slice?.(1, -1) || [];

	if (rootName) {
		const rootCitations = map[rootName].slice(1, -1);
		citations.push(...rootCitations);
	}

	return ['div', { className: 'nav' },
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
	];
}

function Citation ({ snip, emoji }) {
	const [path] = snip.split('#');
	const markdown = stew(fetchText, [`${path}.md`], '', ['p', null, `File not found: ${path}`]);
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
	return content.length && ['div', { className: 'snips' }, ...content];
}

function Block ({ names, data, resources, breadcrumbs }, content) {
	const path = names.join('/');

	if (resources) {
		// TODO: create function to convert MD to MJS on save
		// - convert styles to ['style', ...] and put as first resource node
		// - convert resource css and js to ['link', ...] and ['script', ...] for the rest
		const [heading,, Component, ...blockResources] = stew(fetchCode, [`/${path}.mjs`], {}).default || [];
		content = Component && data ? Component(data, content) : undefined;
		resources.unshift(...blockResources);

		breadcrumbs.unshift(['a', { href: `/${path}` }, heading]);
	} else {
		resources = [];
	}

	if (names.length < 2) {
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
	data = stew(fetchJson, [`/${path}.json`], null);
	return Block({ names, data, resources, breadcrumbs }, content);
}

function resizeTextarea (ref) {
	const [, textarea] = ref;
	textarea.style.height = '0px';
	const { scrollHeight } = textarea;
	textarea.style.height = `${scrollHeight}px`;
}

function Editor ({ names, file }) {
	const schema = stew(fetchCode, [`/${names.slice(0, -1).join('/')}.mjs`], {}).default?.[1];
	const data = stew(fetchJson, [`/${names.join('/')}.json`], {});

	if (!schema) {
		return;
	}

	const formRef = [];
	stew(null, [], () => resizeTextarea(formRef));

	return ['div', {
		className: 'edit',
	},
		['form', {
			ref: formRef,
			onsubmit,
		},
			FormField(schema, data),
			['textarea', {
				ref: formRef,
				className: 'editor',
				placeholder: '(empty)',
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
			onclick: () => {
				const [form] = formRef;
				const textarea = form.querySelector('textarea');
				localStorage.setItem(`/${names.join('/')}.md`, textarea.value);
				// storeSession();
			},
		}, '🖫'],
		['button', {
			className: 'right-button close-button',
			onclick: () => state.isEditing = false,
		}, '✕'],
	];
}

function Page ({ emoji }) {
	const { isEditing, settings } = state;
	const { theme } = settings;

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
			return `/${names.join('/')}`;
		})];
	}, []);

	const isComposite = paths.length > 1;
	const files = paths.map(path => stew(fetchText, [`${path}.md`], ''));

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

	const [rootHash, rootName] = stew(() => {
		if (!map) {
			return [''];
		}

		const { '': hash, ...sections } = map;
		const children = hash.split('#').slice(1);

		if (children.length !== 1) {
			return [hash, ''];
		}

		const root = sections[children[0]];
		return [root[root.length - 1], children[0]];
	}, [map]);

	// TODO: have content be a textarea with the markdown file as value while in editing mode
	// - set formRef on textarea
	// - see how stew code would look with '' serving as ref if array is passed [id, ...refs]

	const includeMenu = rootHash.indexOf('#') !== -1;
	const breadcrumbs = [];

	if (rootName) {
		breadcrumbs.push(map[rootName][0]);
	}

	return ['', {},
		includeMenu && [LeftMenu, { map, rootHash, rootName }],
		['div', {
			className: 'main',
		},
			Block({ names, breadcrumbs }, content),
			includeMenu && ['button', {
				className: 'left-button menu-button',
				onclick: () => state.hideMenu = !state.hideMenu,
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
		!isEditing && [RightMenu, { emoji }],
	];
}

export default function App () {
	const { settings } = state;
	const { theme } = settings;

	const emoji = stew(fetchJson, ['/index.json'], null, {});
	const formatter = stew(fetchCode, ['/index.mjs'], null, {});

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
