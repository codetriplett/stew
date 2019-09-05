import { evaluate } from '../evaluate';

describe('evaluate', () => {
	describe('generate', () => {
		let state;

		beforeEach(() => {
			state = { a: '(a)', b: '(b)', c: '(c)' };
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
			const actual = evaluate([['a', '(a)']], state);
			expect(actual).toEqual([true]);
		});

		it('mismatch', () => {
			const actual = evaluate([['a', '()']], state);
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
			const actual = evaluate(['a', ['b', '(b)']], state);
			expect(actual).toEqual(['a']);
		});
		
		it('static mismatch', () => {
			const actual = evaluate(['a', ['b', '()']], state);
			expect(actual).toEqual([false]);
		});

		it('dynamic static', () => {
			const actual = evaluate([['a'], 'b'], state);
			expect(actual).toEqual(['(a)', 'b']);
		});
		
		it('dynamic static dyamic', () => {
			const actual = evaluate([['a'], 'b', ['c']], state);
			expect(actual).toEqual(['(a)', 'b', '(c)']);
		});
		
		it('dynamic match', () => {
			const actual = evaluate([['a'], ['b', '(b)']], state);
			expect(actual).toEqual(['(a)']);
		});
		
		it('dynamic mismatch', () => {
			const actual = evaluate([['a'], ['b', '()']], state);
			expect(actual).toEqual([false]);
		});

		it('match static', () => {
			const actual = evaluate([['a', '(a)'], 'b'], state);
			expect(actual).toEqual(['b']);
		});
		
		it('match dyamic', () => {
			const actual = evaluate([['a', '(a)'], ['b']], state);
			expect(actual).toEqual(['(b)']);
		});
		
		it('match match', () => {
			const actual = evaluate([['a', '(a)'], ['b', '(b)']], state);
			expect(actual).toEqual([true]);
		});
		
		it('match mismatch', () => {
			const actual = evaluate(
				[['a', '(a)'], ['b', '()']], state
			);

			expect(actual).toEqual([false]);
		});

		it('mismatch static', () => {
			const actual = evaluate([['a', '()'], 'b'], state);
			expect(actual).toEqual(['']);
		});
		
		it('mismatch dyamic', () => {
			const actual = evaluate([['a', '()'], ['b']], state);
			expect(actual).toEqual(['']);
		});
		
		it('mismatch match', () => {
			const actual = evaluate(
				[['a', '()'], ['b', '(b)']], state
			);

			expect(actual).toEqual([false]);
		});
		
		it('mismatch mismatch', () => {
			const actual = evaluate(
				[['a', '()'], ['b', '()']], state
			);

			expect(actual).toEqual([false]);
		});
	});

	describe('hydrate', () => {
		let state;

		beforeEach(() => {
			state = {};
		});

		it('static', () => {
			evaluate(['a'], state, 'a');
			expect(state).toEqual({});
		});

		it('dynamic', () => {
			evaluate([['a']], state, '(a)');
			expect(state).toEqual({ a: '(a)' });
		});

		it('match', () => {
			evaluate([['a', '(a)']], state, true);
			expect(state).toEqual({ a: '(a)' });
		});

		it('mismatch', () => {
			evaluate([['a', '()']], state, false);
			expect(state).toEqual({});
		});

		it('static static', () => {
			evaluate(['a', 'b'], state, 'ab');
			expect(state).toEqual({});
		});
		
		it('static dyamic', () => {
			evaluate(['a', ['b']], state, 'a(b)');
			expect(state).toEqual({ 'b': '(b)' });
		});
		
		it('static match', () => {
			evaluate(['a', ['b', '(b)']], state, 'a');
			expect(state).toEqual({ b: '(b)' });
		});

		it('dynamic static', () => {
			evaluate([['a'], 'b'], state, '(a)b');
			expect(state).toEqual({ a: '(a)' });
		});
		
		it('dynamic static dyamic', () => {
			evaluate([['a'], 'b', ['c']], state, '(a)b(c)');
			expect(state).toEqual({ a: '(a)', c: '(c)' });
		});
		
		it('dynamic match', () => {
			evaluate([['a'], ['b', '(b)']], state, '(a)');
			expect(state).toEqual({ a: '(a)', b: '(b)' });
		});

		it('match static', () => {
			evaluate([['a', '(a)'], 'b'], state, 'b');
			expect(state).toEqual({ a: '(a)' });
		});
		
		it('match dyamic', () => {
			evaluate([['a', '(a)'], ['b']], state, '(b)');
			expect(state).toEqual({ a: '(a)', b: '(b)' });
		});
		
		it('match match', () => {
			evaluate([['a', '(a)'], ['b', '(b)']], state, true);
			expect(state).toEqual({ a: '(a)', b: '(b)' });
		});
		
		it('match string match string', () => {
			evaluate([['a', '(a)'], 'b', ['c', '(c)'], 'd'], state, 'bd');
			expect(state).toEqual({ a: '(a)', c: '(c)' });
		});
		
		it('match string mismatch string', () => {
			evaluate([['a', '(a)'], 'b', ['c', '()'], 'd'], state, 'b');
			expect(state).toEqual({ a: '(a)' });
		});
		
		it('mismatch string match string', () => {
			evaluate([['a', '()'], 'b', ['c', '(c)'], 'd'], state, 'd');
			expect(state).toEqual({ c: '(c)' });
		});
		
		it('mismatch string mismatch string', () => {
			evaluate([['a', '()'], 'b', ['c', '()'], 'd'], state, false);
			expect(state).toEqual({});
		});
	});
});
