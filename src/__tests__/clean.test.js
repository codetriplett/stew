import { clean } from '../clean';

describe('clean', () => {
	it('clears newlines', () => {
		const actual = clean([['\n\t\t', 'value', '\r\t\t']]);
		expect(actual).toEqual([['value']]);
	});

	it('reduces spaces', () => {
		const actual = clean([[' ', ' before  after ', ' ']]);
		expect(actual).toEqual([['before after']]);
	});
	
	it('clears empty attributes', () => {
		const actual = clean([{ key: [] }]);
		expect(actual).toEqual([{}]);
	});

	it('clears empty children', () => {
		const actual = clean([
			[''],
			{ key: 'before' },
			[' '],
			{ key: 'after' },
			['']
		]);

		expect(actual).toEqual([{ key: 'before' }, { key: 'after' }]);
	});
});
