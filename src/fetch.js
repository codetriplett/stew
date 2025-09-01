export function getPath (path, extension) {
	path += `${!path || path.endsWith('/') ? 'index' : ''}${extension ? `.${extension}` : '//'}`;
	const { pathname } = window.location;
	const key = path.startsWith('/') ? path : `${pathname.replace(/[^\/]*$/, '')}${path}`;
	return [key, path];
}

export function fetchNote (path, cache = {}) {
	const [key, filepath] = getPath(path, 'md');
	let promise = cache?.[key];

	if (promise) {
		return promise;
	}

	const file = localStorage.getItem(key);

	promise = file || manifest?.has?.(key) === false
		? Promise.resolve(file || '')
		: fetch(filepath).then(res => {
			return res.ok ? res.text() : '';
		}).catch(err => {
			console.error(err);
			return '';
		});

	if (cache) {
		cache[key] = promise;
	}

	return promise;
}

export function hydrateData (data, cache, stage, promises) {
	if (!data || typeof data !== 'object') {
		return;
	} else if (Array.isArray(data)) {
		for (const item of data) {
			hydrateData(item, cache, stage, promises);
		}

		return;
	}

	const { '': path, ...rest } = data;

	for (const value of Object.values(rest)) {
		hydrateData(value, cache, stage, promises);
	}

	if (typeof path !== 'string' || !/^(\/[^\/\s]+){2,}$/.test(path)) {
		return;
	}

	const promise = fetchData(path, cache, stage);

	const resolution = promise.then(defaults => {
		for (const [name, value] of Object.entries(defaults)) {
			if (!(name in rest)) {
				data[name] = value;
			}
		}
	});

	promises.push(resolution);
	return resolution;
}

export function fetchData (path, cache = {}, stage = {}) {
	const [key, filepath] = getPath(path, 'json');
	let promise = stage[key] || cache?.[key];

	if (promise) {
		return promise;
	}

	const file = localStorage.getItem(key);

	promise = (file || manifest?.has?.(key) === false
		? Promise.resolve(file || '{}').then(file => JSON.parse(file))
		: fetch(filepath).then(res => res.ok ? res.json() : {})
	).then(async data => {
		if (cache) {
			stage[key] = Promise.resolve(data);
			const promises = [];
			hydrateData(data, cache, stage, promises);
			await Promise.all(promises);
			data[''] = key.replace(/[^\/\s]+$/, '');
		}

		return data;
	}).catch(err => {
		console.error(err);
		return {};
	});

	if (cache) {
		cache[key] = promise;
	}

	return promise;
}

export function normalizeCode (code) {
	let { default: array, ...object } = code || {};

	if (!Array.isArray(array)) {
		switch (typeof array) {
			case 'function': {
				array = [array, {}];
				break;
			}
			case 'object': {
				array = [null, array];
				break;
			}
			default: {
				array = [null, {}];
				break;
			}
		}
	} else {
		let [callback, schema, ...rest] = array;

		if (typeof callback !== 'function') {
			callback = null;
		}

		if (typeof schema !== 'object' || Array.isArray(schema)) {
			schema = {};
		}

		array = [callback, schema, ...rest];
	}

	const { '': definition, ...schema } = array[1];

	if (typeof definition === 'string') {
		schema[''] = definition;
	}

	array[1] = schema;
	return { default: array, ...object };
}

export function fetchCode (path, cache = {}) {
	const [key, filepath] = getPath(path, 'mjs');
	let promise = cache?.[key];

	if (promise) {
		return promise;
	}
	
	const file = localStorage.getItem(key);

	promise = import(!file && manifest?.has?.(key) !== false ? filepath : URL.createObjectURL(
		new Blob([file || ''], { type: 'application/javascript' }),
	)).catch(err => {
		console.error(err);
		return {};
	}).then(code => cache ? normalizeCode(code) : code);

	if (cache) {
		cache[key] = promise;
	}

	return promise;
}

export function fetchList (path, cache = {}) {
	const [key, filepath] = getPath(path);
	let promise = cache?.[key];

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
		if (cache) {
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
		}

		return names;
	});

	if (cache) {
		cache[key] = promise;
	}

	return promise;
}
