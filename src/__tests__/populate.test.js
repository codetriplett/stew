import { populate } from '../populate';

describe('populate', () => {
	const resolve = jest.fn();
	let set;

	beforeEach(() => {
		resolve.mockClear();
		set = new Set([resolve]);
	});

	describe('resolve', () => {
		it('should add resolve to set', () => {
			set = new Set();
			populate(resolve, set, 'value');

			expect(set).toEqual(new Set([resolve]));
		});

		it('should add another resolve to set', () => {
			const another = () => {};
			
			set = new Set();
			populate(resolve, set, 'value');
			populate(another, set, 'value');

			expect(set).toEqual(new Set([resolve, another]));
		});

		it('should delete one resolve from set', () => {
			const another = () => {};

			set = new Set();
			populate(resolve, set, 'value');
			populate(another, set, 'value');
			populate(another, set, 'value');

			expect(set).toEqual(new Set([resolve]));
		});

		it('should delete resolve from set', () => {
			const actual = populate(resolve, set, 'value');

			expect(set).toEqual(new Set());
			expect(actual).toBeUndefined();
		});
	});

	describe('value', () => {
		it('should update a value if it changes', () => {
			const actual = populate('new', set, 'old');

			expect(resolve).toHaveBeenCalled();
			expect(actual).toBe('new');
		});

		it('should not update a value if it is the same', () => {
			const actual = populate('value', set, 'value');

			expect(resolve).not.toHaveBeenCalled();
			expect(actual).toBe('value');
		});
	});

	describe('object', () => {
		it('should add properties', () => {
			const another = () => {};

			const store = populate({
				keep: 'old',
				update: {
					keep: 'old',
					update: 'old'
				}
			}, resolve);

			const actual = populate({
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
			const actual = populate({
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

			const store = populate({
				keep: 'old',
				update: {
					keep: 'old',
					update: 'old'
				}
			}, resolve);

			populate({
				update: {
					update: 'new',
					add: 'new'
				},
				add: 'new'
			}, another, store);
			
			const actual = populate({
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
			const actual = populate({ key: 'value' }, resolve);
			expect(actual).toEqual({ key: 'value' });
		});

		it('should not allow override on string', () => {
			const actual = populate({ key: 'value' }, resolve, 'value');
			expect(actual).toEqual('value');
		});

		it('should not allow override on array', () => {
			const actual = populate({ key: 'value' }, resolve, ['value']);
			expect(actual).toEqual(['value']);
		});
	});

	describe('array', () => {
		it('should add items', () => {
			const another = () => {};
			const keep = { key: 'keep' };
			const add = { key: 'add' };
			const store = populate({ array: [keep] }, resolve);
			const actual = populate({ array: [add] }, another, store);

			expect(actual).toEqual({ array: [keep, add] });
		});

		it('should update items', () => {
			const old = { key: 'old' };
			const actual = populate([{ key: 'new' }, old], set, [old]);

			expect(actual).toEqual([{ key: 'new' }, old]);
		});

		it('should allow override on undefined', () => {
			const actual = populate(['value'], resolve);
			expect(actual).toEqual(['value']);
		});

		it('should not allow override on string', () => {
			const actual = populate(['value'], resolve, 'value');
			expect(actual).toEqual('value');
		});

		it('should not allow override on obejct', () => {
			const actual = populate(['value'], resolve, { key: 'value' });
			expect(actual).toEqual({ key: 'value' });
		});
	});
});
