
import state, { updateSettings, packSettingsAndSessions, scrollTo, fetchResources } from '.';
import { fetchNote } from './fetch';
import Editor from './editor';
import Sidebar from './sidebar';

function addSnips (...newSnips) {
	const { classList } = document.body;
	const { snips } = state;
	let wasAdded = false;

	for (const snip of newSnips) {
		const index = snips.indexOf(snip);

		if (index === -1) {
			snips.push(snip);
			wasAdded = true;
		}
	}

	if (!wasAdded) {
		return;
	}

	state.snips = [...snips];
	packSettingsAndSessions();
	updateSettings({ showSnips: true });
	classList.remove('show-left');
	classList.add('show-right');
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
							const { classList } = document.body;
							classList.remove('show-left');
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
function LeftMenu ({ map, directory, resources }, widget) {
	const { focusedSection } = state;
	const root = map['']?.split?.('#')?.[1];
	const hashes = map[root]?.[0];
	const citations = focusedSection && map[focusedSection]?.slice?.(2) || [];

	const citationButtons = citations.map(citation => {
		const { href } = citation[1];
		const [path, ...hashes] = href.split('#');
		const text = getText(citation);

		return hashes.length > 0 && ['li', null,
			['button', {
				type: 'button',
				className: 'citation-button',
				onclick: () => {
					addSnips(...hashes.map(hash => `${path}#${hash}`));
				},
			}, text],
		];
	}).filter(button => button);

	return [Sidebar, { icon: 'menu', toggleProp: 'showMenu', resources, widget },
		!directory ? LeftMenuList(map, hashes) : directory.length > 0 && ['ul', {
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
		citationButtons.length > 0 && ['ul', {
			className: 'citations',
		}, ...citationButtons],
	];
}

// TODO: use resources from the snips own path
// - right now it is using the main pages path
// - the root index is the same for all, but overrides could be different
function Citation ({ snip }) {
	const [path] = snip.split('#');
	const markdown = stew(fetchNote, [path], undefined);
	const [, library, ...resources] = stew(fetchResources, [path], []);

	if (!library) {
		return;
	}

	let content = markdown ? stew(markdown, [snip, library]) : markdown === undefined ? null : ['p', null, `File not found: ${path}.md`];

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

				if (index === -1) {
					return;
				}

				snips.splice(index, 1);
				state.snips = [...snips];
				packSettingsAndSessions();

				if (!snips.length) {
					document.body.classList.remove('show-right')
				}
			},
		}],
		['div', { style: { position: 'relative' } },
			['template', { shadowrootmode: 'open' },
				...resources,
				content,
			],
		],
	];
}

// TODO: have index.md hold emoji nad formatter
// - emoji are already stored in index.json, so index.md should be how that gets authored
// - don't use index.json as schema, like it does for all other pages
// - have H1 store the formatter function
// - have inline CSS override tool styles (e.g. custom themes)
// - can also use resources section to impore React if people prefer

// TODO: clean up UI now that MD MJS and JSON return empty content instead of 404




// generalize sidebar components
// - left nav will be used by drafts, navigation, and form
// - right nav will be used by snips and preview
// - left nav will only fill its own width, while right nav will share space with main area (but less)

export default function Page ({ path, map, resources, breadcrumbs, heading, isModule, markdown, directory, schema, widget }, ...children) {
	const { isEditing, snips } = state;

	if (isEditing) {
		return [Editor, { path, file: markdown, schema, isModule }];
	}

	stew(null, [], () => {
		scrollTo(window.location.hash, 'instant');
		state.hasMounted = true;
	});

	return ['', null,
		// TODO: store array in state for index links that could wrap the left menu links
		// - these are ones that the parents might store in schema['']
		// - allows for creating left nav links that expand to show content for child pages
		[LeftMenu, { map, directory, resources }, widget],
		['div', { className: 'main' },
			['div', { className: 'paper' },
				['ul', { className: 'breadcrumbs' }, 
					['li', null,
						['a', { href: '/' }, 'Home'],
					],
					...breadcrumbs.map(breadcrumb => ['li', null, breadcrumb]),
					heading && ['li', null,
						isModule ? ['a', { href: `${path}/` }, heading] : heading,
						['button', {
							type: 'button',
							className: 'edit-button',
							onclick: () => state.isEditing = true,
						}, '🖉'],
					],
				],
				['div', { style: { position: 'relative' } },
					['template', { shadowrootmode: 'open' },
						...resources,
						...children,
					],
				],
			],
		],
		[Sidebar, { isRight: true, icon: 'snips', toggleProp: 'showSnips' },
			...snips.map(snip => [Citation, { '': snip, snip, resources }]),
		],
	];
}
