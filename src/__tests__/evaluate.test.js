import { evaluate } from '../evaluate';

describe('evaluate', () => {
	describe('generate', () => {
		let state;

		beforeEach(() => {
			state = { a: '(a)', b: '(b)' };
		});

		it('static', () => {
			const actual = evaluate(['a'], state);
			expect(actual).toEqual(['a']);
		});

		it('dynamic', () => {
			const actual = evaluate([['a']], state);
			expect(actual).toEqual(['(a)']);
		});

		it('match', () => {
			const actual = evaluate([['a', true]], state);
			expect(actual).toEqual([true]);
		});

		it('mismatch', () => {
			const actual = evaluate([['a', false]], state);
			expect(actual).toEqual([false]);
		});

		it('static static', () => {
			const actual = evaluate(['a', 'b'], state);
			expect(actual).toEqual(['a', 'b']);
		});
		
		it('static dyamic', () => {
			const actual = evaluate(['a', ['b']], state);
			expect(actual).toEqual(['a', '(b)']);
		});
		
		it('static match', () => {
			const actual = evaluate(['a', ['b', true]], state);
			expect(actual).toEqual(['a']);
		});
		
		it('static mismatch', () => {
			const actual = evaluate(['a', ['b', false]], state);
			expect(actual).toEqual([false]);
		});

		it('dynamic static', () => {
			const actual = evaluate([['a'], 'b'], state);
			expect(actual).toEqual(['(a)', 'b']);
		});
		
		it('dynamic dyamic', () => {
			const actual = evaluate([['a'], ['b']], state);
			expect(actual).toEqual(['(a)', '(b)']);
		});
		
		it('dynamic match', () => {
			const actual = evaluate([['a'], ['b', true]], state);
			expect(actual).toEqual(['(a)']);
		});
		
		it('dynamic mismatch', () => {
			const actual = evaluate([['a'], ['b', false]], state);
			expect(actual).toEqual([false]);
		});

		it('match static', () => {
			const actual = evaluate([['a', true], 'b'], state);
			expect(actual).toEqual(['b']);
		});
		
		it('match dyamic', () => {
			const actual = evaluate([['a', true], ['b']], state);
			expect(actual).toEqual(['(b)']);
		});
		
		it('match match', () => {
			const actual = evaluate([['a', true], ['b', true]], state);
			expect(actual).toEqual([true]);
		});
		
		it('match mismatch', () => {
			const actual = evaluate([['a', true], ['b', false]], state);
			expect(actual).toEqual([false]);
		});

		it('mismatch static', () => {
			const actual = evaluate([['a', false], 'b'], state);
			expect(actual).toEqual(['']);
		});
		
		it('mismatch dyamic', () => {
			const actual = evaluate([['a', false], ['b']], state);
			expect(actual).toEqual(['']);
		});
		
		it('mismatch match', () => {
			const actual = evaluate([['a', false], ['b', true]], state);
			expect(actual).toEqual([false]);
		});
		
		it('mismatch mismatch', () => {
			const actual = evaluate([['a', false], ['b', false]], state);
			expect(actual).toEqual([false]);
		});
	});
});
