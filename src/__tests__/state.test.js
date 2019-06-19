import { state } from '../state';

describe('state', () => {
	const resolve = jest.fn();
	let set;

	beforeEach(() => {
		resolve.mockClear();
		set = new Set([resolve]);
	});

	describe('resolve', () => {
		it('should add resolve to set', () => {
			set = new Set();
			state(resolve, set, 'value');

			expect(set).toEqual(new Set([resolve]));
		});

		it('should add another resolve to set', () => {
			const another = () => {};
			
			set = new Set();
			state(resolve, set, 'value');
			state(another, set, 'value');

			expect(set).toEqual(new Set([resolve, another]));
		});

		it('should delete one resolve from set', () => {
			const another = () => {};

			set = new Set();
			state(resolve, set, 'value');
			state(another, set, 'value');
			state(another, set, 'value');

			expect(set).toEqual(new Set([resolve]));
		});

		it('should delete resolve from set', () => {
			const actual = state(resolve, set, 'value');

			expect(set).toEqual(new Set());
			expect(actual).toBeUndefined();
		});
	});

	describe('value', () => {
		it('should update a value if it changes', () => {
			const actual = state('new', set, 'old');

			expect(resolve).toHaveBeenCalled();
			expect(actual).toBe('new');
		});

		it('should not update a value if it is the same', () => {
			const actual = state('value', set, 'value');

			expect(resolve).not.toHaveBeenCalled();
			expect(actual).toBe('value');
		});
	});

	describe('object', () => {
		it('should add properties', () => {
			const another = () => {};

			const store = state({
				keep: 'old',
				update: {
					keep: 'old',
					update: 'old'
				}
			}, resolve);

			const actual = state({
				update: {
					update: 'new',
					add: 'new'
				},
				add: 'new'
			}, another, store);

			expect(actual).toEqual({
				keep: 'old',
				update: {
					keep: 'old',
					update: 'old',
					add: 'new'
				},
				add: 'new'
			});
		});
		
		it('should update properties', () => {
			const actual = state({
				update: {
					update: 'new',
					add: 'new'
				},
				add: 'new'
			}, set, {
				keep: 'old',
				update: {
					keep: 'old',
					update: 'old'
				}
			});

			expect(actual).toEqual({
				keep: 'old',
				update: {
					keep: 'old',
					update: 'new',
					add: 'new'
				},
				add: 'new'
			});
		});
		
		it('should remove properties', () => {
			const another = () => {};

			const store = state({
				keep: 'old',
				update: {
					keep: 'old',
					update: 'old'
				}
			}, resolve);

			state({
				update: {
					update: 'new',
					add: 'new'
				},
				add: 'new'
			}, another, store);
			
			const actual = state({
				keep: 'old',
				update: {
					keep: 'old',
					update: 'old'
				}
			}, resolve, store);

			expect(actual).toEqual({
				update: {
					update: 'old',
					add: 'new'
				},
				add: 'new'
			});
		});

		it('should allow override on undefined', () => {
			const actual = state({ key: 'value' }, resolve);
			expect(actual).toEqual({ key: 'value' });
		});

		it('should not allow override on string', () => {
			const actual = state({ key: 'value' }, resolve, 'value');
			expect(actual).toEqual('value');
		});

		it('should not allow override on array', () => {
			const actual = state({ key: 'value' }, resolve, ['value']);
			expect(actual).toEqual(['value']);
		});
	});

	describe('array', () => {
		it('should add items', () => {
			const another = () => {};
			const old = { key: 'old' };
			const store = state({ array: [old] }, resolve);
			const actual = state({ array: [{ key: 'new' }] }, another, store);

			expect(actual).toEqual({ array: [old, { key: 'new' }] });
		});

		it('should update items', () => {
			const old = { key: 'old' };
			const actual = state([{ key: 'new' }, old], set, [old]);

			expect(actual).toEqual([{ key: 'new' }, old]);
		});

		it('should allow override on undefined', () => {
			const actual = state(['value'], resolve);
			expect(actual).toEqual(['value']);
		});

		it('should not allow override on string', () => {
			const actual = state(['value'], resolve, 'value');
			expect(actual).toEqual('value');
		});

		it('should not allow override on obejct', () => {
			const actual = state(['value'], resolve, { key: 'value' });
			expect(actual).toEqual({ key: 'value' });
		});
	});
});
