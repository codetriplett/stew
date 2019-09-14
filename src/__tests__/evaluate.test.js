import { evaluate } from '../evaluate';

describe('evaluate', () => {
	describe('generate', () => {
		let state;
		let value;
	
		beforeEach(() => {
			state = { string: 'abc' };
			value = {};
		});

		it('resolves string', () => {
			const actual = evaluate(['abc'], state, value);
			expect(actual).toBe('abc');
		});

		it('resolves value', () => {
			const actual = evaluate([['string']], state, value);
			expect(actual).toBe('abc');
		});

		it('resolves match', () => {
			const actual = evaluate([['string', 'abc']], state, value);
			expect(actual).toBe(true);
		});

		it('resolves mismatch', () => {
			const actual = evaluate([['string', 'xyz']], state, value);
			expect(actual).toBe(false);
		});

		it('resolves string and string', () => {
			const actual = evaluate(['abc', 'xyz'], state, value);
			expect(actual).toBe('abcxyz');
		});

		it('resolves string and value', () => {
			const actual = evaluate(['xyz', ['string']], state, value);
			expect(actual).toBe('xyzabc');
		});

		it('resolves string and match', () => {
			const actual = evaluate(['xyz', ['string', 'abc']], state, value);
			expect(actual).toBe('xyz');
		});

		it('resolves string and mismatch', () => {
			const actual = evaluate(['xyz', ['string', 'xyz']], state, value);
			expect(actual).toBe(false);
		});

		it('resolves value and string', () => {
			const actual = evaluate([['string'], 'xyz'], state, value);
			expect(actual).toBe('abcxyz');
		});

		it('resolves value and value', () => {
			const actual = evaluate([['string'], ['string']], state, value);
			expect(actual).toBe('abcabc');
		});

		it('resolves value and match', () => {
			const actual = evaluate(
				[['string'], ['string', 'abc']], state, value
			);

			expect(actual).toBe('abc');
		});

		it('resolves value and mismatch', () => {
			const actual = evaluate(
				[['string'], ['string', 'xyz']], state, value
			);

			expect(actual).toBe(false);
		});

		it('resolves match and string', () => {
			const actual = evaluate([['string', 'abc'], 'xyz'], state, value);
			expect(actual).toBe('xyz');
		});

		it('resolves match and value', () => {
			const actual = evaluate(
				[['string', 'abc'], ['string']], state, value
			);

			expect(actual).toBe('abc');
		});

		it('resolves match and match', () => {
			const actual = evaluate(
				[['string', 'abc'], ['string', 'abc']], state, value
			);

			expect(actual).toBe(true);
		});

		it('resolves match and mismatch', () => {
			const actual = evaluate(
				[['string', 'abc'], ['string', 'xyz']], state, value
			);

			expect(actual).toBe(false);
		});

		it('resolves mismatch and string', () => {
			const actual = evaluate([['string', 'xyz'], 'xyz'], state, value);
			expect(actual).toBe('');
		});

		it('resolves mismatch and value', () => {
			const actual = evaluate(
				[['string', 'xyz'], ['string']], state, value
			);

			expect(actual).toBe('');
		});

		it('resolves mismatch and match', () => {
			const actual = evaluate(
				[['string', 'xyz'], ['string', 'abc']], state, value
			);

			expect(actual).toBe(false);
		});

		it('resolves mismatch and mismatch', () => {
			const actual = evaluate(
				[['string', 'xyz'], ['string', 'xyz']], state, value
			);

			expect(actual).toBe(false);
		});
	});

	describe('extract', () => {
		let state;

		beforeEach(() => {
			state = {};
		});

		it('resolves string', () => {
			evaluate(['abc'], state, 'abc');
			expect(state).toEqual({});
		});

		it('resolves value', () => {
			evaluate([['string']], state, 'abc');
			expect(state).toEqual({ string: 'abc' });
		});

		it('resolves match', () => {
			evaluate([['string', 'abc']], state, '');
			expect(state).toEqual({ string: 'abc' });
		});

		it('resolves string and string', () => {
			evaluate(['abc', 'xyz'], state, 'abcxyz');
			expect(state).toEqual({});
		});

		it('resolves string and value', () => {
			evaluate(['xyz', ['string']], state, 'xyzabc');
			expect(state).toEqual({ string: 'abc' });
		});

		it('resolves string and match', () => {
			evaluate(['xyz', ['string', 'abc']], state, 'xyz');
			expect(state).toEqual({ string: 'abc' });
		});

		it('resolves value and string', () => {
			evaluate([['string'], 'xyz'], state, 'abcxyz');
			expect(state).toEqual({ string: 'abc' });
		});

		it('resolves value and value', () => {
			evaluate([['string'], ['string']], state, 'abcabc');
			expect(state).toEqual({ string: 'abcabc' });
		});

		it('resolves value and match', () => {
			evaluate([['string'], ['string', 'abc']], state, 'abc');
			expect(state).toEqual({ string: 'abc' });
		});

		it('resolves match and string', () => {
			evaluate([['string', 'abc'], 'xyz'], state, 'xyz');
			expect(state).toEqual({ string: 'abc' });
		});

		it('resolves match and value', () => {
			evaluate([['string', 'abc'], ['string']], state, 'abc');
			expect(state).toEqual({ string: 'abc' });
		});

		it('resolves match and match', () => {
			evaluate([['string', 'abc'], ['string', 'abc']], state, 'abc');
			expect(state).toEqual({ string: 'abc' });
		});

		it('resolves mismatch and string', () => {
			evaluate([['string', 'xyz'], 'xyz'], state, '');
			expect(state).toEqual({});
		});

		it('resolves mismatch and value', () => {
			evaluate([['string', 'xyz'], ['string']], state, '');
			expect(state).toEqual({});
		});
	});
});
