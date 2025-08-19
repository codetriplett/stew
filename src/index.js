import Home from './home';
import Page from './page';
import { fetchNote, fetchData, fetchCode, fetchList } from './fetch';

const { localStorage, location } = window;
const { pathname, hash } = location;
export const library = {};
Object.assign(window, { fetchNote, fetchData, fetchCode, fetchList });

const state = stew({
	focusedSection: hash.slice(1),
	hasMounted: false,
	isEditing: false,
	showLeft: false,
	showRight: false,
	showDrafts: false,
	data: {},
	settings: {},
	snips: [],
	sessions: [],
	sessionIndex: 0,
	revision: 0,
});

export default state;

export function setTheme () {
	const { settings } = state;
	const { theme } = settings;
	const { readonly } = flags;
	document.body.className = `${theme}-theme ${pathname === '/' ? 'home' : 'page'} ${readonly ? 'readonly' : ''}`;
}

export function packSettingsAndSessions () {
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
	setTheme();
}

export function updateSettings (updates) {
	const { settings } = state;
	state.settings = Object.assign({}, settings, updates);
	packSettingsAndSessions();
}

export function scrollTo (hash, behavior) {
	const container = document.querySelector('#app > .main > .paper > div');
	let top = 0;

	if (!container) {
		return;
	} else if (hash) {
		const heading = container.shadowRoot.querySelector(hash);

		if (!heading) {
			return;
		}

		const { y = 0 } = heading.getBoundingClientRect();
		top = y + window.scrollY - (window.innerWidth > 1200 ? 15 : 64);
	}

    window.scrollTo({ top, behavior });
}

export function updateWidth (flexRef, scrollRef, grow) {
	const flexContainer = flexRef?.[''];
	const scrollContainer = scrollRef?.[''];

	if (!flexContainer) {
		return;
	}

	if (!grow || !scrollContainer) {
		const width = scrollContainer?.offsetWidth || 0;
		flexContainer.style.flexBasis = `${width}px`;
		flexContainer.style.width = `${width}px`;
	} else {
		flexContainer.style.flexBasis = '';
		flexContainer.style.width = '';
		const width = flexContainer.clientWidth;
		scrollContainer.style.width = `${width}px`;
	}
}

window.addEventListener('pageshow', () => {
	unpackSettingsAndSessions();
	// updateWidth();
});

window.addEventListener('hashchange', () => {
	const { hash } = window.location;
	state.focusedSection = hash.slice(1);
	scrollTo(hash, 'smooth');
});

window.addEventListener('resize', updateWidth);

// MD
// MJS, MD+DATA
// MJS, MJS+DATA, MD+DATA
// !!! fetch MJS instead of MD at final level if MD render shows it as a module
// - replace MD with MJS and insert new item with empty content
// [content, { ...module, '': data }, { ...module }]

function formatHeading (name) {
	return name.replace(/-+/g, ' ').trim().replace(/( |^)./g, m => m.toUpperCase());
}

const pages = pathname.slice(1).split(/\/(\/+)/);
const names = pages[0].split('/');
const promises = [];
const paths = [];
let name, path = '/';
unpackSettingsAndSessions();

while (names.length) {
	name = names.shift();
	path += name;

	if (promises.length) {
		promises.unshift(name ? fetchData(path) : null);
	}

	if (names.length) {
		promises.unshift(fetchCode(path));
		paths.unshift(path);
		path += '/';
	} else {
		promises.unshift(name ? fetchNote(path) : '');
	}
}

Promise.all([...promises, fetchCode('/')]).then(async sequence => {
	Object.assign(library, sequence.pop());
	const [defaultExport, defaultSchema] = library.default || [];
	library.default = { ...defaultSchema?.[''], '': defaultExport };

	if (sequence.length < 2 && !name) {
		stew('#app', library, [Home]);
		return;
	}

	const markdown = sequence.shift();
	const breadcrumbs = [];
	const resources = [];
	let map, ref, heading, isModule, schema, directory;
	state.data = sequence[0];

	for (let i = sequence.length - 1; i > 0; i -= 2) {
		const { default: defaultExport = [], ...exports } = sequence[i] || {};
		let { '': heading, ...rest } = defaultExport[1] || {};
		Object.assign(library, exports);

		if (typeof heading === 'object') {
			const { '': string, ...rest } = heading;
			Object.assign(library.default, rest);
			heading = string;
		}

		const path = paths.pop();

		if (!heading) {
			const name = path.split('/').pop();
			heading = formatHeading(name);
		}

		breadcrumbs.push(['a', { href: `${path}/` }, heading || 'Unknown']);
		schema = rest;
	}

	const widget = ['', null];
	let content = stew(markdown, [path, library]);

	if (name) {
		if (content) {
			ref = content[2]?.[0] === 'canvas' ? [] : undefined;
			[, map] = content.splice?.(0, 2, 'main', ref ? { ref } : null);
		}

		const [, child] = map && map[''].split('#') || [];
		const [hash, mainHeading] = map?.[child] || [];
		heading = mainHeading || formatHeading(name);
		isModule = !hash ? false : hash.split('#')[0].indexOf(':') !== -1;
	} else {
		const trimmedPath = path.slice(0, -1);
		const names = await fetchList(trimmedPath);
		breadcrumbs[breadcrumbs.length - 1][1].href = trimmedPath;

		directory = names.sort().map(file => {
			const text = formatHeading(file);
			return [`${path}${file}`, text];
		});
	}

	// TODO: move this into Page, and have it run on mount and whenver revision changes
	// - have save() store new data in sequence[0]
	// - it no longer needs to worry about the note becomign a landing page, the trailing slash in the URL does that
	// - shoudl sequence be in state, and setting new [...sequence] triggers a rerender?
	// - change fetch functions to syncronous if they are using local storage values (don't wrap in Promise.resolve)
	for (let i = 0; i < sequence.length; i += 2) {
		const data = sequence[i];
		const exports = sequence[i + 1];
		const defaultExport = exports.default;
		const [Component,, ...rest] = Array.isArray(defaultExport) ? defaultExport : [defaultExport];
		resources.unshift(...rest);

		try {
			// TODO: figure out how to respond to navigation widget changes
			content = typeof Component === 'function' ? [Component, data, content, widget] : content;
		} catch (err) {
			content = null;
			console.error(err);
		}
	}

	stew('#app', library, [Page, {
		path,
		map: map || {},
		ref,
		breadcrumbs,
		heading,
		isModule,
		markdown,
		directory,
		schema,
		widget,
	}, ...resources, content]);
});
