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

		it('parent context', () => {
			state[''] = { string: 'cba' };
			const actual = fetch(['.string'], state);

			expect(backup).toEqual({});
			expect(actual).toBe('cba');
		});

		it('current index', () => {
			state['.'].indices = [1, 2];
			const actual = fetch(['.'], state);

			expect(backup).toEqual({});
			expect(actual).toBe(1);
		});

		it('parent index', () => {
			state['.'].indices = [1, 2];
			const actual = fetch(['..'], state);

			expect(backup).toEqual({});
			expect(actual).toBe(2);
		});

		it('max index', () => {
			const actual = fetch(['array.'], state);

			expect(backup).toEqual({});
			expect(actual).toBe(1);
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

		it('match with variable', () => {
			const actual = fetch(['string', 'string.'], state);

			expect(backup).toEqual({ string: 'abc' });
			expect(actual).toBe(true);
		});
	});

	describe('store', () => {
		let state;

		beforeEach(() => {
			state = { '.': {} };
		});

		it('string', () => {
			const actual = fetch(['string'], state, 'abc');

			expect(state).toEqual({ '.': expect.anything(), string: 'abc' });
			expect(actual).toBe('abc');
		});
	
		it('number', () => {
			const actual = fetch(['number'], state, '123');

			expect(state).toEqual({ '.': expect.anything(), number: 123 });
			expect(actual).toBe(123);
		});
	
		it('empty', () => {
			const actual = fetch(['empty'], state, '');

			expect(state).toEqual({ '.': expect.anything() });
			expect(actual).toBe('');
		});

		it('complex key', () => {
			const actual = fetch(['object.string'], state, 'xyz');

			expect(state).toEqual({
				'.': expect.anything(),
				object: {
					'': expect.anything(),
					'.': expect.anything(),
					string: 'xyz'
				}
			});

			expect(actual).toBe('xyz');
		});

		it('parent context', () => {
			const object = {};
			state[''] = object;
			const actual = fetch(['.string'], state, 'cba');

			expect(object).toEqual({ string: 'cba' });
			expect(actual).toBe('cba');
		});

		it('current index', () => {
			state['.'].indices = [1, 2];
			const actual = fetch(['.'], state, '1');

			expect(state).toEqual({ '.': expect.anything() });
			expect(actual).toBe(1);
		});

		it('parent index', () => {
			state['.'].indices = [1, 2];
			const actual = fetch(['..'], state, '2');

			expect(state).toEqual({ '.': expect.anything() });
			expect(actual).toBe(2);
		});

		it('ignores max index', () => {
			const actual = fetch(['array.'], state, '1');

			expect(state).toEqual({ '.': expect.anything() });
			expect(actual).toBe('1');
		});

		it('uses backup', () => {
			state.string = 'abc';
			const actual = fetch(['string.'], state, 'xyz');

			expect(state).toEqual({ '.': expect.anything(), string: 'abc' });
			expect(actual).toBe('xyz');
		});
	
		it('condition', () => {
			const actual = fetch(['string', 'abc'], state, '');

			expect(state).toEqual({ '.': expect.anything(), string: 'abc' });
			expect(actual).toBe(true);
		});

		it('condition with variable', () => {
			state.string = 'abc';
			const actual = fetch(['string', 'string.'], state, 'abc');

			expect(state).toEqual({ '.': expect.anything(), string: 'abc' });
			expect(actual).toBe(true);
		});
	});

	describe('activate', () => {
		const update = jest.fn();
		let state;

		beforeEach(() => {
			update.mockClear();
			state = { flag: false, index: 0 };
		});

		it('creates toggle', () => {
			const actual = fetch(['flag'], state, 'onclick', update);

			expect(state).toMatchObject({ flag: false });
			expect(actual).toEqual(expect.any(Function));

			actual();

			expect(state).toMatchObject({ flag: true });
			expect(update).toHaveBeenCalled();
		});

		it('creates incrementer', () => {
			const actual = fetch(['index', 2], state, 'onclick', update);

			expect(state).toMatchObject({ index: 0 });
			expect(actual).toEqual(expect.any(Function));

			actual();

			expect(state).toMatchObject({ index: 1 });
			expect(update).toHaveBeenCalled();

			actual();

			expect(state).toMatchObject({ index: 2 });
			expect(update).toHaveBeenCalled();

			actual();

			expect(state).toMatchObject({ index: 0 });
			expect(update).toHaveBeenCalled();
		});

		it('creates decrementer', () => {
			const actual = fetch(['index.', 2], state, 'onclick', update);

			expect(state).toMatchObject({ index: 0 });
			expect(actual).toEqual(expect.any(Function));

			actual();

			expect(state).toMatchObject({ index: 2 });
			expect(update).toHaveBeenCalled();

			actual();

			expect(state).toMatchObject({ index: 1 });
			expect(update).toHaveBeenCalled();

			actual();

			expect(state).toMatchObject({ index: 0 });
			expect(update).toHaveBeenCalled();
		});
	});
});
