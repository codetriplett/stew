import state, { updateSettings, setTheme, updateWidth } from '.';
import { fetchNote } from './fetch';
import Sidebar from './sidebar';

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
	const folderEntries = Object.entries(folders);

	if (!files.length && !folderEntries.length) {
		return;
	}

	return ['ul', { className: 'children' },
		...folderEntries.map(([name, folder]) => {
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

function Drafts ({ paths }) {
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
	}, [paths]);

	return [Sidebar, { icon: 'files', toggleProp: 'showDrafts' },
		Folder(tree),
	];
}

// TODO: add a link in the breadcrumb area with the current date
// - clicking on it will take you to the note for the current day, e.g. 20250709
export default function Home () {
	const { settings, snips } = state;
	const { theme } = settings;
	stew(null, [], () => state.hasMounted = true);
	stew(null, [theme], setTheme);

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
	
	return ['', {},
		[Drafts, { paths }],
		['div', { className: 'main' },
			['div', { className: 'paper' },
				quest,
				[1, null, 'Make\u00A0a\u00A0note. Build\u00A0a\u00A0space.'],
				['p', null,
					'This site serves as a place to store and browse your notes. ',
					'It also supports embedded code to create web pages and games. ',
					'Everything is stored in your browser, but a downloadable version will also be available in the future. ',
					'Navigate to any URL to get started on a new note, or read on to learn the basics. ',
				],
				['div', { className: 'flex-links' },
					['div', null,
						['a', { href: '/markdown' }, 'Markdown'],
						['p', null, 'Decorates notes with basic HTML.'],
					],
					['div', null,
						['a', { href: '/stew' }, 'Stew'],
						['p', null, 'Enables custom layouts and interactivity.'],
					],
					['div', null,
						['a', { href: '/webgl' }, 'WebGL'],
						['p', null, 'Streamlines 2D and 3d graphics.'],
					],
				],
				['p', null,
					'Here are some examples of what you can create. ',
					'Each of them can be edited like any other note, so feel free to make it your own. ',
					'You can reset these ones at any time by clearing your local draft and saving. ',
				],
				['div', { className: 'flex-links' },
					['div', null,
						['a', { href: '/index/' }, 'Calendar'],
						['p', null, 'A view of your daily notes by season.'],
					],
					['div', null,
						['a', { href: '/cube/' }, 'Cube'],
						['p', null, 'A 3D puzzle cube to fidget with.'],
					],
				],
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
				}],
			],
		],
		// TODO: have right menu show past sessions to resume
		// - first link will be for the page to navigate to, remaining links will be for snips to load
		// - include option to clone active session
		// - also show files that have been changed but not yet saved
	];
}
