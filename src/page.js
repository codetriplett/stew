import Editor from './editor';
import state, { fetchNote, updateSettings, packSettingsAndSessions, scrollTo, sideColumns, updateWidths } from '.';

const styles = document.querySelector('#styles').textContent;

function addSnips (...newSnips) {
	const { classList } = document.body;
	const { snips } = state;
	let wasAdded = false;
	updateSettings({ showSnips: true });
	classList.remove('show-menu');
	classList.add('show-snips');

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
						const { pathname, hash } = window.location;

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
function LeftMenu ({ map = {}, ref, directory }, navigation) {
	const { focusedSection, settings } = state;
	const { showMenu } = settings;
	const root = map['']?.split?.('#')?.[1];
	const hashes = map[root]?.[0];
	const isEligible = directory ? directory.length > 0 : !!hashes || navigation.length > 2;
	const menuActive = isEligible && showMenu;
	const citations = focusedSection && map[focusedSection]?.slice?.(2) || [];
	stew(null, [window.location.hash, menuActive], updateWidths);
	sideColumns[0] = [];

	return ['div', {
		className: 'nav',
		ref: sideColumns[0],
	},
		menuActive && ['div', {
			className: 'scroll-column',
			ref: sideColumns[0],
		},
			navigation.length > 2 && ['div', null,
				['template', { shadowrootmode: 'open' }, navigation],
			],
			!directory ? LeftMenuList(map, hashes) : ['ul', {
				className: 'children',
			},
				...directory.map(([href, text]) => {
					return ['li', null,
						['a', {
							href,
							className: 'child-button',
						}, text],
					];
				}),
			],
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
		],
		isEligible ? ['button', {
			type: 'button',
			className: 'left-button menu-button',
			onclick: () => {
				const { classList } = document.body;
				const [, container] = sideColumns[0];
				classList.remove('show-snips');

				// TODO: only add show class if in small view and container was hidden
				// - otherwise add or clear it according to showMenu
				// - button has no effect if show-menu is active when returning to large view right now

				if (classList.contains('show-menu') || container && getComputedStyle(container).display === 'none') {
					classList.toggle('show-menu');
					updateWidths();
				} else {
					classList.add('show-menu');
					updateSettings({ showMenu: !showMenu });
				}
			},
		}] : ref && ['button', {
			type: 'button',
			className: 'left-button fullscreen-button',
			onclick: () => ref[0].requestFullscreen(),
		}],
	];
}

function Citation ({ snip }) {
	const [path] = snip.replace(/^\/+/, '').split('#');
	const markdown = stew(fetchNote, [path], undefined);
	let content = markdown ? stew(markdown, [snip]) : markdown === undefined ? null : ['p', null, `File not found: /${path}.md`];

	if (content && content.length < 3) {
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

function RightMenu () {
	const { snips, settings } = state;
	const { showSnips } = settings;
	const isEligible = snips.length > 0;
	const snipsActive = isEligible && showSnips;
	const content = snips.map(snip => [Citation, { '': snip, snip }]);
	stew(null, [document.body.className, snipsActive], updateWidths);
	sideColumns[1] = [];

	return ['div', {
		className: 'snips',
		ref: sideColumns[1],
	},
		snipsActive && ['div', {
			className: 'scroll-column',
			ref: sideColumns[1],
		}, ...content],
		isEligible && ['button', {
			type: 'button',
			className: 'right-button snips-button',
			onclick: () => {
				const { classList } = document.body;
				const [, container] = sideColumns[1]
				classList.remove('show-menu');

				if (classList.contains('show-snips') || container && getComputedStyle(container).display === 'none') {
					classList.toggle('show-snips');
					updateWidths();
				} else {
					classList.add('show-snips');
					updateSettings({ showSnips: !showSnips });
				}
			},
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

export default function Page ({ path, map, ref, breadcrumbs, heading, markdown, directory, schema, navigation }, ...children) {
	const { isEditing } = state;

	if (isEditing) {
		return [Editor, { path, file: markdown, schema }];
	}

	stew(null, [], () => scrollTo(window.location.hash, 'instant'));

	return ['', {},
		// TODO: store array in state for index links that could wrap the left menu links
		// - these are ones that the parents might store in schema['']
		// - allows for creating left nav links that expand to show content for child pages
		[LeftMenu, { map, ref, directory }, navigation],
		['div', { className: 'main' },
			['ul', { className: 'breadcrumbs' }, 
				['li', null,
					['a', { href: '/' }, 'Home'],
				],
				...breadcrumbs.map(breadcrumb => ['li', null, breadcrumb]),
				heading && ['li', null, heading, ['button', {
					type: 'button',
					className: 'edit-button',
					onclick: () => state.isEditing = true,
				}, '🖉']],
			],
			['div', null,
				['template', { shadowrootmode: 'open' },
					['style', null, styles],
					...children,
				],
			],
		],
		// TODO: if on home page, have right menu show past sessions to resume
		// - first link will be for the page to navigate to, remaining links will be for snips to load
		// - include option to clone active session
		// - also show files that have been changed but not yet saved
		[RightMenu],
	];
}
