(function () {
let stew;

if (typeof window === 'object') {
	stew = window.stew;
	window.App = App;
} else {
	stew = require('../dist/stew.min.js');
	module.exports = App;
}

async function delay (path) {
	const delay = path.endsWith('.md') ? 0 : path.slice(1).split('/').length * 500;
	await new Promise(resolve => setTimeout(resolve, delay));
}

async function importCode (path) {
	// await delay(path);
	return import(path);
}

async function fetchJson (path) {
	// await delay(path);
	return fetch(path).then(data => data.json());
}

async function fetchText (path) {
	// await delay(path);
	return fetch(path).then(data => data.text());
}

const loadedStyles = new Set();

// TODO: change the order of data nd COmponent fetch, with names slice between
// - then put the depth check at the start to avoid having to have it in App as well
function Block ({ names, data }, content) {
	const path = names.join('/');

	if (data !== undefined) {
		// TODO: use stew format that includes css and resources to insert as well
		const [Component,, css] = stew(importCode, [`/${path}.mjs`], {}).default || [];
		content = Component && data ? Component(data, content) : undefined;

		if (css && !loadedStyles.has(path)) {
			const style = document.createElement('style');
			style.innerHTML = css;
			document.head.appendChild(style);
			loadedStyles.add(path);
		}
	}

	if (names.length <= 1) {
		return content;
	}

	names = names.slice(0, -1);
	data = stew(fetchJson, [`/${path}.json`], null);
	return Block({ names, data }, content);
}

function getTextNodes (node) {
	if (!Array.isArray(node)) {
		return [node];
	}

	return [].concat(...node.slice(2).map(getTextNodes));
}

function Section ({ columnSections }) {
	const [firstSection, ...otherSections] = columnSections;
	const [depth] = firstSection;
	
	if (depth === 1) {
		heading = ['div', { className: 'composite-row' }, ...columnSections.map(section => {
			return ['div', { className: 'composite-heading' }, ...section[2].slice(2)];
		})];
	} else {
		heading = [depth, { className: 'composite-heading' }, ...firstSection[2].slice(2)];
	}

	const nestedSections = [];

	for (const [name, value] of Object.entries(firstSection[1])) {
		const otherValues = otherSections.map(section => section[1][name]);

		if (otherValues.every(value => value)) {
			nestedSections.push([value, ...otherValues]);
		}
	}

	return ['', {},
		heading,
		['div', { className: 'composite-row' },
			...columnSections.map(section => ['div', {}, ...section.slice(3)]),
		],
		...nestedSections.map(columnSections => Section({ columnSections })),
	];
}

function Composite ({ columns }) {
	if (columns.length < 2) {
		return columns[0];
	}

	const columnSections = columns.map(column => {
		let section = [0, {}];
		const stack = [section];

		for (const node of column.slice(2)) {
			const [depth] = node;
			
			if (typeof depth === 'number') {
				const count = stack.findIndex(section => section[0] < depth);
				const text = getTextNodes(node).join('');
				section = [depth, {}];
				stack.splice(0, count, section);
				stack[1][1][text] = section;
			}

			section.push(node);
		}

		return Object.values(stack.pop()[1])[0];
	});

	// only include headings, that exist across all columns
	// - it gets too complicated to shuffle them if they are in different orders otherwise (e.g. once that are missing in rightmost columns)
	// - page would get pretty long if all the content existed in narrow columns, with blank spaces anyway
	// - just run through the hierarchy of the leftmost column and include a row if there is a match across all columns
	// - h1 can be different though, just render the first

	return ['main', {}, Section({ columnSections })];
}

function App () {
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
		return [names, ...paths];
	}, []);
	
	const stack = [...names];

	const columns = paths.map(path => {
		const [dots, ...rest] = path.split('/');
		const { length } = dots;
		stack.splice(-length, length, ...rest);
		const markdown = stew(fetchText, [`/${stack.join('/')}.md`], undefined);
		return stew(markdown, [`${path}#`]);
	});

	const content = columns.every(column => column) && Composite({ columns });

	if (names.length < 2) {
		return content;
	}

	return Block({ names }, content);
}
})();
