import { getPath, fetchNote, fetchData } from './fetch';

let location, fetchStorage, localStorage;

beforeEach(() => {
	fetchStorage = {
		'remote.md': 'remote note',
		'remote.json': '{"type":"remote data"}',
	};

	localStorage = {
		'/folder/local.md': 'local note',
		'/folder/local.json': '{"type":"local data"}',
		getItem: key => localStorage[key] || null,
	};
	
	location = { pathname: '/folder/' };

	Object.assign(globalThis, {
		window: { location },
		localStorage,
		fetch: async path => {
			const file = fetchStorage[path];

			return {
				ok: true,
				text: () => file,
				json: () => JSON.parse(file),
			};
		},
	});
})

describe('getPath', () => {
	it('absolute path', () => {
		const actual = getPath('/folder/file', 'md');
		expect(actual).toEqual(['/folder/file.md', '/folder/file.md']);
	});

	it('absolute index path', () => {
		const actual = getPath('/folder/', 'md');
		expect(actual).toEqual(['/folder/index.md', '/folder/index.md']);
	});

	it('relative path', () => {
		const actual = getPath('file', 'md');
		expect(actual).toEqual(['/folder/file.md', 'file.md']);
	});

	it('fetches note with relative index path', () => {
		const actual = getPath('', 'md');
		expect(actual).toEqual(['/folder/index.md', 'index.md']);
	});
});

describe('fetchNote', () => {
	it('fetches from fetch storage', async () => {
		const cache = {};
		let actual = await fetchNote('remote', cache);
		expect(actual).toEqual('remote note');
		actual = await cache['/folder/remote.md'];
		expect(actual).toEqual('remote note');
	});

	it('fetches from local storage', async () => {
		const cache = {};
		let actual = await fetchNote('local', cache);
		expect(actual).toEqual('local note');
		actual = await cache['/folder/local.md'];
		expect(actual).toEqual('local note');
	});

	it('fetches from cache', async () => {
		const cache = { '/folder/cache.md': 'cache note' };
		let actual = await fetchNote('cache', cache);
		expect(actual).toEqual('cache note');
		actual = await cache['/folder/cache.md'];
		expect(actual).toEqual('cache note');
	});
});

describe('fetchData', () => {
	it('fetches from fetch storage', async () => {
		const cache = {};
		let actual = await fetchData('remote', cache);
		expect(actual).toEqual({ type: 'remote data' });
		actual = await cache['/folder/remote.json'];
		expect(actual).toEqual({ type: 'remote data' });
	});

	it('fetches from local storage', async () => {
		const cache = {};
		let actual = await fetchData('local', cache);
		expect(actual).toEqual({ type: 'local data' });
		actual = await cache['/folder/local.json'];
		expect(actual).toEqual({ type: 'local data' });
	});

	it('includes reference data', async () => {
		Object.assign(localStorage, {
			'/folder/reference.json': '{"value":"reference value"}',
			'/folder/local.json': '{"":"/folder/reference","type":"local data"}',
		});

		const cache = {};
		let actual = await fetchData('local', cache);
		
		expect(actual).toEqual({
			'': '/folder/reference type',
			type: 'local data',
			value: 'reference value',
		});

		expect(cache).toEqual({
			'': new Set(),
			'/folder/local.json': expect.any(Promise),
			'/folder/reference.json': expect.any(Promise),
		});
	});

	it('includes circular reference data', async () => {
		Object.assign(localStorage, {
			'/folder/local.json': '{"":"/folder/local","type":"local data"}',
		});

		const cache = {};
		let actual = await fetchData('local', cache);
		
		expect(actual).toEqual({
			'': '/folder/local type',
			type: 'local data',
		});
		
		actual = await cache['/folder/local.json'];
		
		expect(actual).toEqual({
			'': '/folder/local type',
			type: 'local data',
		});
	});
});
