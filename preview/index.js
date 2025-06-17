(function () {
let stew;

if (typeof window === 'object') {
	stew = window.stew;
	window.App = App;
} else {
	stew = require('../dist/stew.min.js');
	module.exports = App;
}

const state = stew({});

const { pathname } = window.location;
const theme = window.localStorage.getItem('theme') || 'dark';
document.body.className = `${theme}-theme`;

function fetchText (path) {
	const file = window.localStorage.getItem(path);
	return file || fetch(path).then(res => res.text()).catch(() => '');
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

function LeftMenuList (sections, hash) {
	const children = hash.split('#').slice(1);

	return !children.length ? null : ['ul', null,
		...children.map(name => {
			const [text, ...rest] = sections[name];
			const hash = rest.pop();
			
			return ['li', null,
				text,
				LeftMenuList(sections, hash),
			];
		}),
	];
}

function LeftMenu ({ map }) {
	if (!map) {
		return;
	}

	let { '': hash, ...sections } = map;
	const children = hash.split('#').slice(1);

	if (children.length === 1) {
		hash = sections[children[0]].slice(-1)[0]
	}
console.log(hash);
	return LeftMenuList(sections, hash)
}

function RightMenu () {
	return ['div', null, 'Right Menu'];
}

function Block ({ names, data, resources }, content) {
	const path = names.join('/');

	if (resources) {
		// TODO: change this to [Component, schema, ...resources]
		// - resources should already have them converted to stew arrays (link, style, script)
		// - the rest of module will be used for named exports
		const [Component,, styles, ...urls] = stew(fetchCode, [`/${path}.mjs`], {}).default || [];
		const cssUrls = urls.filter(url => url.endsWith('.css'));
		const jsUrls = urls.filter(url => /\.m?js$/.test(url));
		content = Component && data ? Component(data, content) : undefined;

		// TODO: remove these, since css and js will already have them saved in this format
		for (const src of jsUrls.reverse()) {
			resources.unshift(['script', { type: 'module', src }]);
		}

		for (const href of cssUrls.reverse()) {
			resources.unshift(['link', { rel: 'stylesheet', href }]);
		}

		if (styles) {
			resources.unshift(['style', null, styles]);
		}
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

function Page () {
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

	const styles = stew(() => {
		return document.querySelector('#styles').textContent;
	}, []);
	
	// TODO: read and parse customizations object from localStage as an onmount memo for use in markdown call

	const columns = paths.map(path => {
		// TODO: include a revision number in deps to ensure new files are used once saved
		// - this param won't be used by the function, so it should be fine
		const markdown = stew(fetchText, [`${path}.md`], undefined);
		return stew(markdown, [path, {}]);
	});

	// TODO: clean up old map and manifest code
	// - no longer need to maintain a map
	// - ranges aren't needed, since markdown will render to the hash sections you give it
	// - references aren't needed, since markdown will include the citations per section
	// - this should clean up quite a bit of code and complexity
	// console.log('======= link map', columns[0][1]);

	const content = columns.length < 2 ? ['main', null, columns[0]] : ['main', {
		style: { display: 'flex' },
	},
		...columns.map(column => ['div', { style: { flex: '0 1 0' } }, ...column.slice(2)]),
	];

	const { hash, draftData, draft, snips, isLeftNavExpanded = true, isEditing, isChanged } = state;
	const hashPath = `${pathname}${hash}`;
	const formRef = [];

	// const manifest = stew(() => {
	// 	const manifest = {};
	// 	getCitations(pathname, manifest);
	// 	return manifest;
	// 	// getMentions(pathname, citations);
	// }, [content, hash]);

	// const leftButtonClassName = `expand-left ${!isLeftNavExpanded ? 'toggle-off' : ''}`;
	const leftButtonClassName = 'expand-left';

	return ['', {},
		// TODO: toggle between left nav and editing mode
		isEditing
			? [Editor, { formRef, draftData, file }]
			: isLeftNavExpanded && [LeftMenu, { map: columns[0]?.[1] }],
		['div', {
			className: 'main',
		},
			// TODO: don't show left nav or edit button if showing a composite of two files
			!isEditing
				? ['button', {
					className: leftButtonClassName,
					onclick: () => {
						// state.isLeftNavExpanded = !isLeftNavExpanded;
					},
				}, '≡']
				: isChanged
					? ['button', {
						className: leftButtonClassName,
						onclick: () => {
							const [form, textarea] = formRef;
							
							if (!form.reportValidity()) {
								return null;
							}

							Object.assign(state, {
								draftData: processForm(form),
								draft: textarea.value === files[pathname] ? null : textarea.value,
								isChanged: false,
							});
						},
					}, '👁']
					// TODO: only show this if draft has been previewed and there are changes from what is currently saved
					// - maybe show delete button if draft is '' instead of null
					: ['button', {
						className: leftButtonClassName,
						onclick: () => {
							if (draftData !== null) {
								updateFile(pathname, draftData, 'json');
							}

							if (draft !== null) {
								updateFile(pathname, draft, 'md');
							}

							storeSession();
						},
					}, '🖫'],
			// TODO: have separate 'reset' and 'delete' button
			!isEditing
				? ['button', {
					className: 'expand-right',
					onclick: () => {
						// state.isEditing = true;
					},
				}, '✎']
				: isChanged
					? ['button', {
						className: 'expand-right',
						onclick: () => {
							Object.assign(state, {
								draft: null,
								isChanged: false,
							});
						},
					}, '🗑︎'] // TODO: change this to cancel symbol (circle with slash)
					: ['button', {
						className: 'expand-right',
						onclick: () => {
							// state.isEditing = false;
						},
					}, '✕'],
			['div', {},
				['template', { shadowrootmode: 'open' },
					['style', null, styles],
					names.length > 1 ? Block({ names }, content) : content,
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
