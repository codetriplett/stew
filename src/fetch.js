
export function fetchNote (path) {
	path = `/${path}.md`;
	const file = localStorage.getItem(path);

	return file ? Promise.resolve(file) : fetch(path).then(res => {
		return res.ok ? res.text() : '';
	}).catch(err => {
		console.error(err);
		return '';
	});
}

export function fetchData (path) {
	path = `/${path}.json`;
	const file = localStorage.getItem(path);
	let json;

	if (!file) {
		return fetch(path).then(res => {
			return res.ok ? res.json() : {};
		}).catch(err => {
			console.error(err);
			return {};
		})
	}

	try {
		json = JSON.parse(file);
	} catch (err) {
		json = {};
	}

	return Promise.resolve(json);
}

export function fetchCode (path) {
	path = `/${path}.mjs`;
	const file = localStorage.getItem(path);

	return import(!file ? path : URL.createObjectURL(
		new Blob([file], { type: 'application/javascript' }),
	)).catch(err => {
		console.error(err);
		return { default: [null, {}] };
	});
}
