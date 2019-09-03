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
			const actual = evaluate([['a', true, '(a)']], state);
			expect(actual).toEqual([true]);
		});

		it('mismatch', () => {
			const actual = evaluate([['a', false, '(a)']], state);
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
			const actual = evaluate(['a', ['b', true, '(b)']], state);
			expect(actual).toEqual(['a']);
		});
		
		it('static mismatch', () => {
			const actual = evaluate(['a', ['b', false, '(b)']], state);
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
			const actual = evaluate([['a'], ['b', true, '(b)']], state);
			expect(actual).toEqual(['(a)']);
		});
		
		it('dynamic mismatch', () => {
			const actual = evaluate([['a'], ['b', false, '(b)']], state);
			expect(actual).toEqual([false]);
		});

		it('match static', () => {
			const actual = evaluate([['a', true, '(a)'], 'b'], state);
			expect(actual).toEqual(['b']);
		});
		
		it('match dyamic', () => {
			const actual = evaluate([['a', true, '(a)'], ['b']], state);
			expect(actual).toEqual(['(b)']);
		});
		
		it('match match', () => {
			const actual = evaluate([['a', true, '(a)'], ['b', true]], state);
			expect(actual).toEqual([true]);
		});
		
		it('match mismatch', () => {
			const actual = evaluate(
				[['a', true, '(a)'], ['b', false, '(b)']], state
			);

			expect(actual).toEqual([false]);
		});

		it('mismatch static', () => {
			const actual = evaluate([['a', false, '(a)'], 'b'], state);
			expect(actual).toEqual(['']);
		});
		
		it('mismatch dyamic', () => {
			const actual = evaluate([['a', false, '(a)'], ['b']], state);
			expect(actual).toEqual(['']);
		});
		
		it('mismatch match', () => {
			const actual = evaluate(
				[['a', false, '(a)'], ['b', true, '(b)']], state
			);

			expect(actual).toEqual([false]);
		});
		
		it('mismatch mismatch', () => {
			const actual = evaluate(
				[['a', false, '(a)'], ['b', false, '(b)']], state
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
			evaluate([['a', true, '(a)']], state, true);
			expect(state).toEqual({ a: '(a)' });
		});

		it('presence', () => {
			evaluate([['a', true]], state, true);
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
			evaluate(['a', ['b', true, '(b)']], state, 'a');
			expect(state).toEqual({ b: '(b)' });
		});
		
		it('static presence', () => {
			evaluate(['a', ['b', true]], state, 'a');
			expect(state).toEqual({});
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
			evaluate([['a'], ['b', true, '(b)']], state, '(a)');
			expect(state).toEqual({ a: '(a)', b: '(b)' });
		});
		
		it('dynamic presence', () => {
			evaluate([['a'], ['b', true]], state, '(a)');
			expect(state).toEqual({ a: '(a)' });
		});

		it('match static', () => {
			evaluate([['a', true, '(a)'], 'b'], state, 'b');
			expect(state).toEqual({ a: '(a)' });
		});
		
		it('match dyamic', () => {
			evaluate([['a', true, '(a)'], ['b']], state, '(b)');
			expect(state).toEqual({ a: '(a)', b: '(b)' });
		});
		
		it('match match', () => {
			evaluate([['a', true, '(a)'], ['b', true, '(b)']], state, true);
			expect(state).toEqual({ a: '(a)', b: '(b)' });
		});
		
		it('match presence', () => {
			evaluate([['a', true, '(a)'], ['b', true]], state, true);
			expect(state).toEqual({ a: '(a)' });
		});
		
		it('presence static', () => {
			evaluate([['a', true], 'b'], state, 'b');
			expect(state).toEqual({});
		});
		
		it('presence dynamic', () => {
			evaluate([['a', true], ['b']], state, '(b)');
			expect(state).toEqual({ b: '(b)' });
		});
		
		it('presence match', () => {
			evaluate([['a', true], ['b', true, '(b)']], state, true);
			expect(state).toEqual({ b: '(b)' });
		});
		
		it('presence presence', () => {
			evaluate([['a', true], ['b', true]], state, true);
			expect(state).toEqual({});
		});
	});
});
