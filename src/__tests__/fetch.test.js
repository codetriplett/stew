import { fetch } from '../fetch';

describe('fetch', () => {
	describe('generate', () => {
		it('string', () => {
			const actual = fetch('static');
			expect(actual).toBe('static')
		});
	});
});
