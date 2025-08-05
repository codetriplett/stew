export async function fetchNote (path) {
	path = `/${path}.md`;
	const file = localStorage.getItem(path);

	if (file) {
		return file;
	}

	try {
		const res  = await fetch(path);
		return res.ok ? res.text() : '';
	} catch (err) {
		console.error(err);
		return '';
	}
}

export async function fetchData (path) {
	path = `/${path}.json`;
	const file = localStorage.getItem(path);

	if (file) {
		try {
			return JSON.parse(file);
		} catch (err) {
			return {};
		}
	}

	try {
		const res = await fetch(path);
		return res.ok ? await res.json() : {};
	} catch (err) {
		console.error(err);
		return {};
	}
}

export async function fetchCode (path) {
	path = `/${path}.mjs`;
	const file = localStorage.getItem(path);

	try {
		return import(!file ? path : URL.createObjectURL(
			new Blob([file], { type: 'application/javascript' }),
		));
	} catch (err) {
		console.error(err);
		return { default: [null, {}] };
	}
}

export async function fetchList (path) {
	const folder = `/${path}/`;
	const res = await fetch(`${folder}/`);
	const names = await res.json();

	for (const path in localStorage) {
		const index = path.lastIndexOf('/');

		if (path.startsWith(folder) && path.endsWith('.md') && index === folder.length - 1) {
			const name = path.slice(folder.length, -3);

			if (names.indexOf(name) === -1) {
				names.push(name);
			}
		}
	}

	return names;
}

Object.assign(window, { fetchNote, fetchData, fetchCode, fetchList });
