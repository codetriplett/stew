import { getItem } from './fetch';

let location, localStorage;

beforeEach(() => {
	localStorage = {
		'/folder/file.md': 'note',
		'/folder/file.json': '{"type":"data"}',
		'/folder/file.mjs': 'export default \'code\'',
		getItem: key => localStorage[key] || null,
	};
	
	location = { pathname: '/folder/' };
	Object.assign(globalThis, { window: { location }, localStorage });
})

describe('getItem', () => {
	it('fetches note with absolute path', () => {
		const actual = getItem('/folder/file', 'md');
		expect(actual).toEqual(['/folder/file.md', 'note']);
	});

	it('fetches note with absolute index path', () => {
		const actual = getItem('/folder/', 'md');
		expect(actual).toEqual(['/folder/index.md', null]);
	});

	it('fetches note with relative path', () => {
		const actual = getItem('file', 'md');
		expect(actual).toEqual(['file.md', 'note']);
	});

	it('fetches note with relative index path', () => {
		const actual = getItem('', 'md');
		expect(actual).toEqual(['index.md', null]);
	});
});
