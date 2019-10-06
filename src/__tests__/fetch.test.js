import { fetch, TOGGLE } from '../fetch';

describe('fetch', () => {
	describe('generate', () => {
		let data;
		let copy;
		let backup;
		let state;

		beforeEach(() => {
			data = {
				string: 'abc',
				object: { string: 'xyz' },
				strings: ['abc', 'xyz'],
				objects: [{ string: 'abc' }, { string: 'xyz' }]
			};

			copy = JSON.parse(JSON.stringify(data));
			backup = {};
			state = { ...data, '.': [backup] };
			state[''] = state;
		});

		it('string', () => {
			const actual = fetch('abc', state);
			expect(actual).toBe('abc');
		});

		it('variable', () => {
			const actual = fetch(['string'], state);
			expect(actual).toBe('abc');
		});

		it('sibling', () => {
			Object.assign(state, {
				'': { '': state, '.': [{}], number: 123 },
				'.': [{}, 'string']
			});

			const actual = fetch(['.number'], state);
			expect(actual).toBe(123);
		});

		it('self', () => {
			state = Object.assign('abc', {
				'': { string: 'abc' },
				'.': [{}, 'string']
			});

			const actual = fetch([''], state);
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
				'.': [backup.object, 'object'],
				string: 'xyz'
			});
		});

		it('array', () => {
			const actual = fetch(['strings'], state);

			expect(actual).toEqual(Object.assign(['abc', 'xyz'], {
				'': state,
				'.': [backup.strings, 'strings']
			}));
		});

		it('array of objects', () => {
			const actual = fetch(['objects'], state);

			expect(actual).toEqual(Object.assign([
				{
					'': state,
					'.': [backup.objects[0], 'objects', 0],
					string: 'abc'
				},
				{
					'': state,
					'.': [backup.objects[1], 'objects', 1],
					string: 'xyz'
				}
			], {
				'': state,
				'.': [backup.objects, 'objects'],
			}));
		});

		it('does not set up missing property', () => {
			const actual = fetch(['missing'], state);
			expect(actual).toBeUndefined();
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
			state['.'].push('strings', 3, 1);
			const actual = fetch(['.'], state);
			expect(actual).toBe(3);
		});

		it('parent index', () => {
			state['.'].push('strings', 3, 1);
			const actual = fetch(['..'], state);
			expect(actual).toBe(1);
		});

		it('length', () => {
			const actual = fetch(['strings.'], state);
			expect(actual).toBe(1);
		});
	});

	describe('hydrate', () => {
		const update = jest.fn();
		let state;

		beforeEach(() => {
			state = { '.': [update] };
			state[''] = state;
		});

		it('includes string', () => {
			const actual = fetch('abc', state, 'abc');

			expect(state).toEqual({ '': state, '.': [update] });
			expect(actual).toBe('abc');
		});

		it('ignores string', () => {
			const actual = fetch('abc', state, 'cba');

			expect(state).toEqual({ '': state, '.': [update] });
			expect(actual).toBe('');
		});

		it('includes variable', () => {
			const actual = fetch(['string'], state, 'abc');

			expect(state).toEqual({ '': state, '.': [update], string: 'abc' });
			expect(actual).toBe('abc');
		});

		it('ignores variable', () => {
			const actual = fetch(['string'], state, '');

			expect(state).toEqual({ '': state, '.': [update] });
			expect(actual).toBe('');
		});

		it('number', () => {
			const actual = fetch(['number'], state, '123');

			expect(state).toEqual({ '': state, '.': [update], number: 123 });
			expect(actual).toBe(123);
		});

		it('match', () => {
			const actual = fetch(['string', 'cba'], state, 'xyz');

			expect(state).toEqual({ '': state, '.': [update], string: 'cba' });
			expect(actual).toBe(true);
		});

		it('match with variable', () => {
			state.value = 'abc';
			const actual = fetch(['string', 'value.'], state, 'xyz');

			expect(state).toEqual({
				'': state, '.': [update], value: 'abc', string: 'abc'
			});

			expect(actual).toBe(true);
		});

		it('ignore match with missing', () => {
			const actual = fetch(['string', 'value.'], state, 'xyz');

			expect(state).toEqual({ '': state, '.': [update] });
			expect(actual).toBe(false);
		});

		it('creates object', () => {
			const actual = fetch(['object'], state, 0);
			const object = { '': state, '.': [update, 'object'] }

			expect(state).toEqual({ '': state, '.': [update], object });
			expect(actual).toEqual(object);
		});

		it('creates array', () => {
			const actual = fetch(['array'], state, 2);

			const array = Object.assign([
				{ '': state, '.': [update, 'array', 0] },
				{ '': state, '.': [update, 'array', 1] }
			], {
				'': state,
				'.': [update, 'array']
			});

			expect(state).toEqual({ '': state, '.': [update], array });
			expect(actual).toEqual(array);
		});

		it('uses existing object', () => {
			const object = { '': 'abc', '.': [update, 'abc'] };
			state.object = object;
			const actual = fetch(['object'], state, 0);

			expect(state).toEqual({ '': state, '.': [update], object });
			expect(actual).toEqual(object);
		});

		it('does not create object when updating', () => {
			state['.'][0][''] = true;
			const actual = fetch(['missing'], state);
			expect(actual).toBeUndefined();
		});

		it('index', () => {
			state['.'].push('strings', 3, 1);
			const actual = fetch(['.'], state, '');

			expect(state).toEqual({
				'': state, '.': [update, 'strings', 3, 1]
			});

			expect(actual).toBe(3);
		});

		it('parent index', () => {
			state['.'].push('strings', 3, 1);
			const actual = fetch(['..'], state, '');

			expect(state).toEqual({
				'': state, '.': [update, 'strings', 3, 1]
			});

			expect(actual).toBe(1);
		});

		it('length', () => {
			const actual = fetch(['array.'], state, '1');

			expect(state).toEqual({ '': state, '.': [update] });
			expect(actual).toBe(undefined);
		});
	});

	describe('activate', () => {
		const update = jest.fn();
		let state;

		beforeEach(() => {
			state = { boolean: false, '.': [update] };
		});

		it('creates toggle action', () => {
			const actual = fetch(['boolean'], state, TOGGLE);

			expect(actual).toEqual(expect.any(Function));
			expect(state.boolean).toBe(false);
		});

		it('toggles boolean on', () => {
			const actual = fetch(['boolean'], state, TOGGLE);

			actual();
			expect(state).toEqual({ boolean: true, '.': [update] });
		});

		it('toggles boolean off', () => {
			state.boolean = true;
			const actual = fetch(['boolean'], state, TOGGLE);

			actual();
			expect(state).toEqual({ boolean: false, '.': [update] });
		});
	});
});
