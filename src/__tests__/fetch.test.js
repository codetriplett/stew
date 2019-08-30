import { fetch } from '../fetch';

describe('fetch', () => {
	it('reads property', () => {
		const actual = fetch({ string: 'abc' }, 'string');
		expect(actual).toBe('abc');
	});
});
