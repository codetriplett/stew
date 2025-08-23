export function getPath (path, extension) {
	path += `${!path || path.endsWith('/') ? 'index' : ''}${extension ? `.${extension}` : '//'}`;
	const { pathname } = window.location;
	const key = path.startsWith('/') ? path : `${pathname.replace(/[^\/]*$/, '')}${path}`;
	return [key, path];
}

export function fetchNote (path, cache = {}) {
	const [key, filepath] = getPath(path, 'md');
	let promise = cache[key];

	if (promise) {
		return promise;
	}

	const file = localStorage.getItem(key);

	promise = file ? Promise.resolve(file) : fetch(filepath).then(res => {
		return res.ok ? res.text() : '';
	}).catch(err => {
		console.error(err);
		return '';
	});

	cache[key] = promise;
	return promise;
}

// TODO: allow '' prop to store overrides for things to ignore from default data
// - this would allow user to clear a default value, since otherewise it wouldn't get saved
// - e.g. { '': '/folder/file xyz' } -> { '': '/folder/file value', abc: 123 } (when /folder/file had abc and xyz props)
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

	// TODO: add a way to add overrides that clear to data that is saved to file
	// - maybe click disabled text field to remove it
	// - disabled text fields only show up when the default value is not overriden anyway
	const [path, ...overrides] = meta.trim().split(/\s+/);

	if (!/^\/.*[^\/]$/.test(path)) {
		return;
	}

	fetchData(path, cache);
	const promise = cache[`${path}.json`];
	overrides.push(...Object.keys(rest));

	const resolution = promise.then(defaults => {
		for (const [name, value] of Object.entries(defaults)) {
			if (overrides.indexOf(name) === -1) {
				data[name] = value;
			}
		}
	});

	data[''] = [path, ...Object.keys(rest)].join(' ');
	promises.push(resolution);
}

export function fetchData (path, cache = {}) {
	const [key, filepath] = getPath(path, 'json');
	let promise = cache[key];
	let set = cache[''];

	if (promise) {
		return promise;
	} else if (!set) {
		set = new Set();
		cache[''] = set;
	}
	
	const file = localStorage.getItem(key);

	promise = (file
		? Promise.resolve(file).then(file => JSON.parse(file))
		: fetch(filepath).then(res => res.ok ? res.json() : {})
	).catch(err => {
		console.error(err);
		return {};
	});

	const resolution = promise.then(async data => {
		const promises = [];
		hydrateData(data, cache, promises);
		await Promise.all(promises);
		cache[key] = resolution;
		set.delete(key);
		return data;
	});

	set.add(key);
	cache[key] = promise;
	return resolution;
}

export function fetchCode (path, cache = {}) {
	const [key, filepath] = getPath(path, 'mjs');
	let promise = cache[key];

	if (promise) {
		return promise;
	}
	
	const file = localStorage.getItem(key);

	promise = import(!file ? filepath : URL.createObjectURL(
		new Blob([file], { type: 'application/javascript' }),
	)).catch(err => {
		console.error(err);
		return {};
	});

	cache[key] = promise;
	return promise;
}

export function fetchList (path, cache = {}) {
	const [key, filepath] = getPath(path);
	let promise = cache[key];

	if (promise) {
		return promise;
	}

	const folder = filepath.slice(0, -1);

	promise = fetch(filepath).then(res => {
		return res.ok ? res.json() : [];
	}).catch(err => {
		console.error(err);
		return [];
	}).then(names => {
		for (const key in localStorage) {
			if (!key.startsWith(folder) || key.lastIndexOf('/') !== folder.length - 1) {
				continue;
			}

			let name;

			if (key.endsWith('.md')) {
				name = key.slice(folder.length, -3);
			} else if (key.endsWith('.json')) {
				name = key.slice(folder.length, -5);
			}

			if (name && names.indexOf(name) === -1) {
				names.push(name);
			}
		}

		return names;
	});

	cache[key] = promise;
	return promise;
}
