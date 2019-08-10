import $, { mock } from './mock';
import { evaluate } from '../evaluate';

describe('evaluate', () => {
	describe('generate', () => {
		it('forms content', () => {
			const actual = evaluate($('({x})'), $({ x: 'y' }));
			expect(actual).toBe('(y)');
		});

		it('forms attribute', () => {
			const actual = evaluate($('({x})'), $({ x: 'y' }), 'z');
			expect(actual).toBe(' z="(y)"');
		});

		it('cleans class attribute', () => {
			const actual = evaluate($(' a {x y} b '), $({ x: 'y' }), 'class');
			expect(actual).toBe(' class="a b"');
		});

		it('forms flag', () => {
			const actual = evaluate($('{x y}'), $({ x: 'y' }), 'z');
			expect(actual).toBe(' z');
		});

		it('clears attribute', () => {
			const actual = evaluate($('a{x Y}'), $({ x: 'y' }), 'z');
			expect(actual).toBe('');
		});
		
		it('ignores action', () => {
			const actual = evaluate($('{x}'), $({ x: () => {} }), 'onclick');
			expect(actual).toBe('');
		});
		
		it('forms something more complicated', () => {
			const actual = evaluate($('a {x y}b{X Y}B'), $({ x: 'y' }));
			expect(actual).toBe('a b');
		});
	});

	describe('hydrate', () => {
		const update = jest.fn();
		let state;

		beforeEach(() => {
			update.mockClear();
			state = $({});
		});

		it('extracts content', () => {
			const element = $('y');
			const actual = evaluate($('{x}'), state, '', element, update);

			expect(state).toEqual($({ x: 'y' }));
			expect(actual).toBe(element)
		});

		it('extracts literal content', () => {
			const element = $('y');
			const actual = evaluate($('{}'), state, '', element, update);

			expect(state).toEqual({ '': 'y' });
			expect(actual).toBe(element);
		});

		it('extracts attribute', () => {
			evaluate($('{x}'), state, 'z', $('div', { z: 'y' }), update);
			expect(state).toEqual($({ x: 'y' }));
		});

		it('ignores missing attribute', () => {
			evaluate($('{x}'), state, 'z', $('div', {}), update);
			expect(state).toEqual($({}));
		});

		it('extracts flag', () => {
			evaluate($('{x y}'), state, 'z', $('div', { z: '' }), update);
			expect(state).toEqual($({ x: 'y' }));
		});

		it('ignores missing flag', () => {
			evaluate($('{x y}'), state, 'z', $('div', {}), update);
			expect(state).toEqual($({}));
		});
		
		it('sets action', () => {
			evaluate($('{x}'), state, 'onclick', $('div', {}), update);

			expect(mock.mock.calls).toEqual([
				['div', 'listen', 'click', expect.any(Function)]
			]);
			
			expect(state).toEqual($({}));
		});
		
		it('extracts something more complicated', () => {
			evaluate($('a {x y}b{x Y}c'), state, '', $('a b'), update);
			expect(state).toEqual($({ x: 'y' }));
		});
	});

	describe('update', () => {
		it('updates content', () => {
			evaluate($('{x}'), $({ x: 'Y' }), '', $('y'));
			expect(mock.mock.calls).toEqual([['y', 'nodeValue', 'Y']]);
		});

		it('ignores content', () => {
			evaluate($('{x}'), $({ x: 'y' }), '', $('y'));
			expect(mock).not.toHaveBeenCalled();
		});

		it('updates attribute', () => {
			evaluate($('{x}'), $({ x: 'Y' }), 'z', $('div', { z: 'y' }));
			expect(mock.mock.calls).toEqual([['div', 'set', 'z', 'Y']]);
		});

		it('ignores attribute', () => {
			evaluate($('{x}'), $({ x: 'y' }), 'z', $('div', { z: 'y' }));
			expect(mock).not.toHaveBeenCalled();
		});

		it('sets flag', () => {
			evaluate($('{x y}'), $({ x: 'y' }), 'z', $('div', {}));
			expect(mock.mock.calls).toEqual([['div', 'toggle', 'z', true]]);
		});

		it('does not set flag', () => {
			evaluate($('{x y}'), $({ x: 'y' }), 'z', $('div', { z: '' }));
			expect(mock).not.toHaveBeenCalled();
		});

		it('clears flag', () => {
			evaluate($('{x y}'), $({ x: 'Y' }), 'z', $('div', { z: '' }));
			expect(mock.mock.calls).toEqual([['div', 'remove', 'z']]);
		});

		it('clears flag', () => {
			evaluate($('{x y}'), $({ x: 'Y' }), 'z', $('div', {}));
			expect(mock).not.toHaveBeenCalled();
		});
		
		it('ignores action', () => {
			evaluate($('{x}'), $({}), 'onclick', $('div', {}));
			expect(mock).not.toHaveBeenCalled();
		});
	});
});
