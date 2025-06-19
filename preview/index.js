(function () {
let stew;

if (typeof window === 'object') {
	stew = window.stew;
	window.App = App;
} else {
	stew = require('../dist/stew.min.js');
	module.exports = App;
}

const state = stew({
	snips: ['/site/category/other#second', '/site/category/other#zeroth'],
	focusedSection: '',
	hideMenu: false,
	isEditing: false,
});

const { pathname } = window.location;
const styles = document.querySelector('#styles').textContent;
const theme = window.localStorage.getItem('theme') || 'dark';
document.body.className = `${theme}-theme`;
let emoji;

try {
	emoji = JSON.parse(window.localStorage.getItem('emoji') || '{}');
} catch (err) {
	emoji = {};
}

function fetchText (path) {
	const file = window.localStorage.getItem(path);

	return file || fetch(path).then(res => {
		if (!res.ok) {
			throw 'Not found';
		}
		
		return res.text()
	});
}

function fetchJson (path) {
	const file = window.localStorage.getItem(path);
	return file ? JSON.parse(file) : fetch(path).then(res => res.json()).catch(() => null);
}

function fetchCode (path) {
	const file = window.localStorage.getItem(path);

	if (file) {
		return import(URL.createObjectURL(
			new Blob([file], { type: 'application/javascript' })
		));
	}

	return import(path).catch(() => {
		console.error(`Not found: ${path}`);
	});
}

function Editor () {
	return ['div', null, 'Editor'];
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

function LeftMenu ({ map, rootHash, rootName = '' }) {
	const { hideMenu, focusedSection, snips } = state;

	if (hideMenu || !map) {
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
	];
}

function Citation ({ snip }) {
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
			className: 'close',
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

function RightMenu () {
	const { snips } = state;
	const content = snips.map(snip => [Citation, { '': snip, snip }]);
	return content.length && ['div', { className: 'snips' }, ...content];
}

function Block ({ names, data, resources }, content) {
	const path = names.join('/');

	if (resources) {
		// TODO: create function to convert MD to MJS on save
		// - convert styles to ['style', ...] and put as first resource node
		// - convert resource css and js to ['link', ...] and ['script', ...] for the rest
		const [Component,, ...blockResources] = stew(fetchCode, [`/${path}.mjs`], {}).default || [];
		content = Component && data ? Component(data, content) : undefined;
		resources.unshift(...blockResources);
	} else {
		resources = [];
	}

	if (names.length < 2) {
		return ['', null, ...resources, content];
	}

	names = names.slice(0, -1);
	data = stew(fetchJson, [`/${path}.json`], null);
	return Block({ names, data, resources }, content);
}

function resizeTextarea (ref) {
	const [, textarea] = ref;
	textarea.style.height = '0px';
	const { scrollHeight } = textarea;
	textarea.style.height = `${scrollHeight}px`;
}

function Page () {
	const { isEditing } = state;
	const formRef = [];

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
			return `/${names.join('/')}`;
		})];
	}, []);

	// TODO: create composite from all documents
	// - merge sections across documents into rows if they share the same id (and parents share the same ids)
	const [column] = paths.map((path, i) => {
		const markdown = stew(fetchText, [`${path}.md`], '');

		if (!isEditing) {
			return stew(markdown, [path, emoji]);
		} else if (i > 0) {
			return;
		}

		return ['', null,
			['form', {
				ref: formRef,
				className: 'edit',
				// onkeyup: () => state.isChanged = true,
			},
				// FormField(schema, data),
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
				}, markdown],
			],
		];
	});

	const content = column && ['main', null, ...column.slice(2)];
	const map = column?.[1];

	const [rootHash, rootName] = stew(() => {
		if (!map) {
			return [''];
		}

		const { '': hash, ...sections } = map;
		const children = hash.split('#').slice(1);

		if (children.length !== 1) {
			return hash;
		}

		const root = sections[children[0]];
		return [root[root.length - 1], children[0]];
	}, [map]);

	// TODO: have content be a textarea with the markdown file as value while in editing mode
	// - set formRef on textarea
	// - see how stew code would look with '' serving as ref if array is passed [id, ...refs]

	const includeMenu = rootHash.indexOf('#') !== -1;

	return ['', {},
		includeMenu && [LeftMenu, { map, rootHash, rootName }],
		// TODO: redo the layout so 'main' becomes 'edit' when editing
		['div', {
			className: 'main',
		},
			isEditing
				?  ['button', {
					className: 'expand-left',
					onclick: () => {
						if (draftData !== null) {
							updateFile(pathname, draftData, 'json');
						}

						if (draft !== null) {
							updateFile(pathname, draft, 'md');
						}

						storeSession();
					},
				}, '🖫']
				: includeMenu && ['button', {
					className: 'expand-left',
					onclick: () => state.hideMenu = !state.hideMenu,
				}, '≡'],
			isEditing
				? ['button', {
					className: 'expand-right',
					onclick: () => state.isEditing = false,
				}, '✕']
				: ['button', {
					className: 'expand-right',
					onclick: () => state.isEditing = true,
				}, '✎'],
			isEditing ? content : ['div', {},
				['template', { shadowrootmode: 'open' },
					['style', null, styles],
					!isEditing && names.length > 1 ? Block({ names }, content) : content,
				],
			],
		],
		!isEditing && [RightMenu],
	];
}

// TODO: give overview here
// - also show list of files that have drafts
function HomePage () {
	const { settings } = state;
	const { theme = 'dark' } = settings;

	stew(null, [theme], () => {
		document.body.className = `${theme}-theme`;
	});

	return ['div', {
		className: 'main',
	},
		['button', {
			type: 'button',
			style: {
				position: 'absolute',
				right: '15px',
			},
			onclick: () => {
				const newTheme = theme === 'dark' ? 'light' : 'dark';
				// state.settings = { ...settings, theme: newTheme };
				// localStorage.setItem('settings', JSON.stringify(state.settings));
			},
		}, 'switch to ', theme === 'dark' ? 'light' : 'dark', ' mode'],
		[1, {}, 'Bring Your Notes to Life'],
		['p', {},
			'At its core, this is a simple note-taking tool that allows you to create links between notes for easy exploration. Notes are formatted in Markdown, which is a common and straightforward format that offers great portability. This tool extends that to support blocks of code that can wrap your notes in interective elements to create websites, or even 3d graphics. Even if you have no coding experience, this tool can serve as an entry point to learn those skills, without needing to learn complex build systems.',
		],
		['small', {},
			'All notes are stored locally in your browser. Everything here is a work in progress, but feel free to try it out for yourself.',
		],
	];
}

function App () {
	return pathname === '/' ? HomePage : Page;
}
})();
