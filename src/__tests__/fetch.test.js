import { fetch } from '../fetch';

describe('fetch', () => {
	it('reads property', () => {
		const actual = fetch(['string'], { string: 'abc' });
		expect(actual).toBe('abc');
	});
});
