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
	console.log('request:', path);
	const delay = path.endsWith('.md') ? 0 : path.slice(1).split('/').length * 500;
	await new Promise(resolve => setTimeout(resolve, delay));
	console.log('response:', path);
}

async function importCode (path) {
	await delay(path);
	return import(path);
}

async function fetchJson (path) {
	await delay(path);
	return fetch(path).then(data => data.json());
}

async function fetchText (path) {
	await delay(path);
	return fetch(path).then(data => data.text());
}

// TODO: change the order of data nd COmponent fetch, with names slice between
// - then put the depth check at the start to avoid having to have it in App as well
function Block ({ names, depth, data }, content) {
	const path = names.join('/');

	if (data !== undefined) {
		// TODO: use stew format that includes css and resources to insert as well
		const Component = stew(importCode, [`/${path}.mjs`], {}).default;
		content = Component && data ? Component(data, content) : content;
	}

	if (names.length <= 1 || names.length <= depth) {
		return content;
	}

	names = names.slice(0, -1);
	data = stew(fetchJson, [`/${path}.json`], null);
	return Block({ names, depth, data }, content);
}

/*
/site/category/page: three levels of component
/site/component//page: one level
//site/component/page//other: compare page with other, both wrapped in parent components
- essentially, // serves as a break. The first break sets the start of the component chain, and each additional break adds a comparison column
*/
function App () {
	const { pathname } = window.location;
	const path = pathname.replace(/\/$/, '');
	const names = path.slice(1).split('/');
	const index = Math.max(0, names.indexOf(''));
	names.splice(index, 1);
	const markdown = stew(fetchText, [`${path}.md`], null);
	const content = stew(markdown, [`${path}#`]);

	if (names.length <= index) {
		return content;
	}

	return Block({ names, depth: index + 1 }, content);
}
})();
