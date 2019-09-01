import { stitch } from '../stitch';

describe('stitch', () => {
	it('joins markup', () => {
		const actual = stitch(['(', 'value', ')']);
		expect(actual).toBe('(value)');
	});
});
