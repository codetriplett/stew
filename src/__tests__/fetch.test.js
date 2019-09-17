import { fetch } from '../fetch';

describe('fetch', () => {
	describe('read', () => {
		let backup;
		let state;

		beforeEach(() => {
			backup = {};

			state = {
				'.': { '': 1, backup },
				number: 1,
				string: 'abc',
				object: { string: 'xyz' },
				array: ['cba', 'zyx']
			};
		});

		it('variable', () => {
			const actual = fetch(['string'], state);

			expect(backup).toEqual({});
			expect(actual).toBe('abc');
		});

		it('complex key', () => {
			const actual = fetch(['object.string'], state);

			expect(backup).toEqual({});
			expect(actual).toBe('xyz');
		});

		it('stores backup', () => {
			const actual = fetch(['string.'], state);

			expect(backup).toEqual({ string: 'abc' });
			expect(actual).toBe('abc');
		});

		it('match', () => {
			const actual = fetch(['string', 'abc'], state);

			expect(backup).toEqual({});
			expect(actual).toBe(true);
		});

		it('mismatch', () => {
			const actual = fetch(['string', 'xyz'], state);

			expect(backup).toEqual({});
			expect(actual).toBe(false);
		});

		it('max index', () => {
			const actual = fetch(['number', 'array.'], state);

			expect(backup).toEqual({});
			expect(actual).toBe(true);
		});

		it('match with variable', () => {
			const actual = fetch(['string', 'string.'], state);

			expect(backup).toEqual({ string: 'abc' });
			expect(actual).toBe(true);
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

		it('complex key', () => {
			const actual = fetch(['object.string'], state, 'xyz');

			expect(state).toEqual({
				object: { '': expect.anything(), string: 'xyz' }
			});

			expect(actual).toBe('xyz');
		});

		it('uses backup', () => {
			state.string = 'abc';
			const actual = fetch(['string.'], state, 'xyz');

			expect(state).toEqual({ string: 'abc' });
			expect(actual).toBe('xyz');
		});

		it('ignores max index', () => {
			const actual = fetch(['number', 'array.'], state, '1');

			expect(state).toEqual({});
			expect(actual).toBe(true);
		});
	
		it('condition', () => {
			const actual = fetch(['string', 'abc'], state, '');

			expect(state).toEqual({ string: 'abc' });
			expect(actual).toBe(true);
		});

		it('condition with variable', () => {
			state.string = 'abc';
			const actual = fetch(['string', 'string.'], state, 'abc');

			expect(state).toEqual({ string: 'abc' });
			expect(actual).toBe(true);
		});
	});
});
