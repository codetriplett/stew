import { fetch } from '../fetch';

describe('fetch', () => {
	describe('read', () => {
		let state;

		beforeEach(() => {
			state = { string: 'abc' };
		});

		it('variable', () => {
			const actual = fetch(['string'], state);
			expect(actual).toBe('abc');
		});

		it('match', () => {
			const actual = fetch(['string', 'abc'], state);
			expect(actual).toBe(true);
		});

		it('mismatch', () => {
			const actual = fetch(['string', 'xyz'], state);
			expect(actual).toBe(false);
		});
	});

	describe('store', () => {
		let state;

		beforeEach(() => {
			state = {};
		});
	
		it('string', () => {
			const actual = fetch(['string'], state, 'abc');

			expect(state).toEqual({ string: 'abc' });
			expect(actual).toBe('abc');
		});
	
		it('number', () => {
			const actual = fetch(['number'], state, '123');

			expect(state).toEqual({ number: 123 });
			expect(actual).toBe(123);
		});
	
		it('empty', () => {
			const actual = fetch(['empty'], state, '');

			expect(state).toEqual({});
			expect(actual).toBe('');
		});
	
		it('condition', () => {
			const actual = fetch(['string', 'abc'], state, '');

			expect(state).toEqual({ string: 'abc' });
			expect(actual).toBe(true);
		});
	});
});
