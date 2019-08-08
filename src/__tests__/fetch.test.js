import { fetch } from '../fetch';

describe('fetch', () => {
	describe('fetch', () => {
		it('returns input string', () => {
			const actual = fetch('string', {});
			expect(actual).toBe('string');
		});
	
		it('fetches present property', () => {
			const actual = fetch(['value'], { value: 'string' });
			expect(actual).toBe('string');
		});

		it('fetches literal state', () => {
			const actual = fetch([''], { '': 'string' });
			expect(actual).toBe('string');
		});
	
		it('fetches index property', () => {
			const actual = fetch(['.'], { '.': 1 });
			expect(actual).toBe(1);
		});
	
		it('fetches scope property', () => {
			const actual = fetch([''], { '': 1 });
			expect(actual).toBe(1);
		});
	
		it('ignores missing property', () => {
			const actual = fetch(['value'], {});
			expect(actual).toBeUndefined();
		});
	
		it('fetches true condition', () => {
			const actual = fetch(['value', 1], { value: 1 });
			expect(actual).toBe(true);
		});
	
		it('fetches false condition', () => {
			const actual = fetch(['value', 2], { value: 1 });
			expect(actual).toBe(false);
		});
	
		it('returns conditional string', () => {
			const actual = fetch(['value', 1], { value: 1 }, 'string');
			expect(actual).toBe('string');
		});
	});

	describe('extract', () => {
		let state;

		beforeEach(() => {
			state = {};
		});

		it('reduces existing string', () => {
			const actual = fetch('string', state, '', 'stringremainder');

			expect(state).toEqual({});
			expect(actual).toBe('remainder');
		});
	
		it('ignores input string', () => {
			const actual = fetch('string', state, '', 'remainder');
			
			expect(state).toEqual({});
			expect(actual).toBe('remainder');
		});

		it('extracts string property before another', () => {
			const actual = fetch(['value'], state, 'after', 'stringafter');

			expect(state).toEqual({ value: 'string' });
			expect(actual).toBe('after');
		});

		it('extracts literal state', () => {
			const actual = fetch([''], state, 'after', 'stringafter');

			expect(state).toEqual({ '': 'string' });
			expect(actual).toBe('after');
		});

		it('extracts string property at the end', () => {
			const actual = fetch(['value'], state, '', 'string');

			expect(state).toEqual({ value: 'string' });
			expect(actual).toBe('');
		});

		it('extracts number property', () => {
			const actual = fetch(['value'], state, '', '1');

			expect(state).toEqual({ value: 1 });
			expect(actual).toBe('');
		});

		it('extracts true property', () => {
			const actual = fetch(['value'], state, '', 'true');

			expect(state).toEqual({ value: true });
			expect(actual).toBe('');
		});

		it('extracts false property', () => {
			const actual = fetch(['value'], state, '', 'false');

			expect(state).toEqual({ value: false });
			expect(actual).toBe('');
		});

		it('ignores empty value', () => {
			const actual = fetch(['value'], state, '', '');

			expect(state).toEqual({});
			expect(actual).toBe('');
		});

		it('extracts true condition', () => {
			const actual = fetch(['value', 1], state, 'prefix', 'prefixsuffix');

			expect(state).toEqual({ value: 1 });
			expect(actual).toBe('suffix');
		});

		it('ignores false condition', () => {
			const actual = fetch(['value', 1], state, 'prefix', 'suffix');

			expect(state).toEqual({});
			expect(actual).toBe('suffix');
		});

		it('extracts condition at end', () => {
			const actual = fetch(['value', 1], state, undefined, '');

			expect(state).toEqual({ value: 1 });
			expect(actual).toBe('');
		});

		it('ignores condition at end', () => {
			const actual = fetch(['value', 1], state, undefined, null);

			expect(state).toEqual({});
			expect(actual).toBe(null);
		});

		it('ignores conditional string at end', () => {
			const actual = fetch(['value', 1], state, 'string', '');

			expect(state).toEqual({});
			expect(actual).toBe('');
		});

		it('creates click action', () => {
			const state = {};
			const update = jest.fn();
			const actual = fetch(['value'], state, '', update);

			expect(state).toEqual({});
			expect(actual).toEqual(expect.any(Function));

			actual('event');

			expect(update).toHaveBeenCalledWith(state, 'value', 'event');
		});
	});
});
