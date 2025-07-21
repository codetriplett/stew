import state, { fetchNote, updateSettings, setTheme, updateWidth } from '.';
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
