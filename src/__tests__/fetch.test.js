import { fetch } from '../fetch';

describe('fetch', () => {
	describe('retrieve', () => {
		let data;
		let copy;
		let backup;
		let settings;
		let state;

		beforeEach(() => {
			data = {
				string: 'abc',
				object: { string: 'xyz' },
				strings: ['abc', 'xyz'],
				objects: [{ string: 'abc' }, { string: 'xyz' }]
			};

			copy = JSON.parse(JSON.stringify(data));
			state = { ...data };
			backup = {};
			settings = { '': [0], backup };

			Object.assign(state, { '': state, '.': settings });
		});

		it('string', () => {
			const actual = fetch('abc', state);
			expect(actual).toBe('abc');
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

		it('match with variable', () => {
			const actual = fetch(['string', 'string.'], state);
			expect(actual).toBe(true);
		});

		it('object', () => {
			const actual = fetch(['object'], state);

			expect(actual).toEqual({
				'': state,
				'.': {
					...settings,
					backup: backup.object
				},
				string: 'xyz'
			});
		});

		it('array', () => {
			const actual = fetch(['strings'], state);

			expect(actual).toEqual(Object.assign(['abc', 'xyz'], {
				'': state,
				'.': {
					...settings,
					backup: backup.strings
				}
			}));
		});

		it('array of objects', () => {
			const actual = fetch(['objects'], state);

			expect(actual).toEqual(Object.assign([
				{
					'': state,
					'.': {
						'': [0, 0],
						backup: backup.objects[0]
					},
					string: 'abc'
				},
				{
					'': state,
					'.': {
						'': [1, 0],
						backup: backup.objects[1]
					},
					string: 'xyz'
				}
			], {
				'': state,
				'.': {
					...settings,
					backup: backup.objects
				}
			}));
		});

		it('does not mutate data', () => {
			fetch(['objects'], state);
			expect(data).toEqual(copy);
		});

		it('backup', () => {
			const actual = fetch(['string.'], state);

			expect(backup).toEqual({ string: 'abc' });
			expect(actual).toBe('abc');
		});

		it('index', () => {
			const actual = fetch(['.'], state);
			expect(actual).toBe(0);
		});

		it('length', () => {
			const actual = fetch(['strings.'], state);
			expect(actual).toBe(1);
		});
	});

	describe('store', () => {
		let settings;
		let state;
		let values;

		beforeEach(() => {
			settings = { '': [0] };
			state = { '.': settings };
			values = ['abc', 'xyz'];
		});

		it('includes string', () => {
			const actual = fetch('abc', state, values);

			expect(state).toEqual({ '.': settings });
			expect(values).toEqual(['xyz']);
			expect(actual).toBe('abc');
		});

		it('ignores string', () => {
			const actual = fetch('cba', state, values);

			expect(state).toEqual({ '.': settings });
			expect(values).toEqual(['abc', 'xyz']);
			expect(actual).toBe('');
		});

		it('includes variable', () => {
			const actual = fetch(['string'], state, values);

			expect(state).toEqual({ '.': settings, string: 'abc' });
			expect(values).toEqual(['xyz']);
			expect(actual).toBe('abc');
		});

		it('ignores variable', () => {
			values[0] = '';
			const actual = fetch(['string'], state, values);

			expect(state).toEqual({ '.': settings });
			expect(values).toEqual(['xyz']);
			expect(actual).toBe('');
		});

		it('number', () => {
			const actual = fetch(['number'], state, ['123']);

			expect(state).toEqual({ '.': settings, number: 123 });
			expect(actual).toBe(123);
		});

		it('match', () => {
			const actual = fetch(['string', 'cba'], state, values);

			expect(state).toEqual({ '.': settings, string: 'cba' });
			expect(values).toEqual(['abc', 'xyz']);
			expect(actual).toBe(true);
		});

		it('match with variable', () => {
			state.value = 'abc';
			const actual = fetch(['string', 'value.'], state, values);

			expect(state).toEqual({
				'.': settings, value: 'abc', string: 'abc'
			});

			expect(values).toEqual(['abc', 'xyz']);
			expect(actual).toBe(true);
		});

		it('ignore match with missing', () => {
			const actual = fetch(['string', 'value.'], state, values);

			expect(state).toEqual({ '.': settings });
			expect(values).toEqual(['abc', 'xyz']);
			expect(actual).toBe(false);
		});

		it('index', () => {
			const actual = fetch(['.'], state, values);

			expect(state).toEqual({ '.': settings });
			expect(values).toEqual(['abc', 'xyz']);
			expect(actual).toBe(0);
		});

		it('length', () => {
			const actual = fetch(['array.'], state, values);

			expect(state).toEqual({ '.': settings });
			expect(values).toEqual(['abc', 'xyz']);
			expect(actual).toBe(undefined);
		});
	});
});
