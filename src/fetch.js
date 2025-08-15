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

// TODO: test this
export function hydrateData (data, cache) {
	if (!data || typeof data !== 'object') {
		return;
	} else if (Array.isArray(data)) {
		for (const item of data) {
			hydrateData(item, cache);
		}

		return;
	}

	const { '': path, ...rest } = data;

	for (const value of Object.values(rest)) {
		hydrateData(value, cache);
	}

	if (!/^\/.*[^\/]$/.test(path)) {
		return;
	}

	fetchData(path.slice(1), cache).then(defaults => {
		// make sure it doesn't replace the values that were overriden
		for (const [name, value] of Object.entries(defaults)) {
			if (!(name in rest)) {
				data[name] = value;
			}
		}
	});
}

export function fetchData (path, cache) {
	if (cache?.[path]) {
		return cache[path];
	}

	const filepath = `/${path}.json`;
	const file = localStorage.getItem(filepath);
	const isRoot = !cache;
	
	const promise = !file ? fetch(filepath) : Promise.resolve({
		ok: true,
		json: () => JSON.parse(file),
	});

	const result = promise.then(res => {
		return res.ok ? res.json() : {};
	}).then(data => {
		// hydrateData(data, cache);
		return data;
	}).catch(err => {
		console.error(err);
		return {};
	});

	if (!isRoot) {
		cache[path] = result;
		return result;
	}

	cache = { [path]: result };
	
	return Promise.all(Object.values(cache)).then(([data]) => {
		return data;
	});
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
