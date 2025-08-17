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

export function hydrateData (data, cache, promises) {
	if (!data || typeof data !== 'object') {
		return;
	} else if (Array.isArray(data)) {
		for (const item of data) {
			hydrateData(item, cache, promises);
		}

		return;
	}

	const { '': meta, ...rest } = data;

	for (const value of Object.values(rest)) {
		hydrateData(value, cache, promises);
	}

	if (typeof meta !== 'string') {
		return;
	}

	const path = meta.trim().split(' ')[0];

	if (!/^\/.*[^\/]$/.test(path)) {
		return;
	} else if (!(path in cache)) {
		fetchData(path.slice(1), cache);
	}

	const promise = cache[path].then(defaults => {
		for (const [name, value] of Object.entries(defaults)) {
			if (!(name in rest)) {
				data[name] = value;
			}
		}

		data[''] = [path, ...Object.keys(rest)].join(' ');
	});

	promises.push(promise);
}

export async function fetchData (path, cache = {}) {
	const filepath = `/${path}.json`;
	const file = localStorage.getItem(filepath);

	const promise = (file
		? Promise.resolve(file).then(file => JSON.parse(file))
		: fetch(filepath).then(res => res.ok ? res.json() : {})
	).catch(err => {
		console.error(err);
		return {};
	});

	cache[`/${path}`] = promise;
	const data = await promise;
	const promises = [];
	hydrateData(data, cache, promises);
	await Promise.all(promises);
	return data;
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
		if (!path.startsWith(folder) || path.lastIndexOf('/') !== folder.length - 1) {
			continue;
		}

		let name;

		if (path.endsWith('.md')) {
			name = path.slice(folder.length, -3);
		} else if (path.endsWith('.json')) {
			name = path.slice(folder.length, -5);
		}

		if (name && names.indexOf(name) === -1) {
			names.push(name);
		}
	}

	return names;
}
