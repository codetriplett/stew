import state, { updateSettings, setTheme } from '.';
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
	const remainingFiles = new Set(files);

	if (!files.length && !folderEntries.length) {
		return;
	}

	return ['ul', { className: 'children' },
		...folderEntries.map(([name, folder]) => {
			const useLink = remainingFiles.has(name);
			remainingFiles.delete(name);

			return ['li', null,
				useLink
					? ['a', { href: `${path}${name}`, className: 'child-button' }, name]
					: ['span', { className: 'child-button' }, name],
				Folder(folder, `${path}${name}/`),
			];
		}),
		...[...remainingFiles].map(name => {
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
export default function Home ({ cache, namespace }) {
	const { settings, snips } = state;
	const { theme } = settings;
	stew(null, [], () => state.hasMounted = true);
	stew(null, [theme], setTheme);

	const paths = stew(() => {
		return Object.keys(localStorage).filter(name => /^\/.*\.(md|json)$/.test(name));
	}, []);

	const quest = stew(async () => {
		if (!namespace) {
			return;
		}

		const date = new Date();
		const dateText = date.toDateString();
		const year = date.getFullYear();
		const month = String(date.getMonth() + 101);
		const day = String(date.getDate() + 100);
		const path = `/${namespace}/${year}${month.slice(1)}${day.slice(1)}`;
		const markdown = await fetchNote(path, cache);
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

	const markdown = stew(fetchNote, ['/', cache], null);
	const content = stew(markdown, ['/']);
	const index = content?.findIndex?.(item => Array.isArray(item) && item[0] > 1);
	
	return ['', null,
		[Drafts, { paths }],
		['div', { className: 'main' },
			['div', { className: 'paper' },
				quest,
				content?.slice?.(0, index),
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
