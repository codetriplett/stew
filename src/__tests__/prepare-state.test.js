import { prepareState } from '../prepare-state';

describe('prepareState', () => {
	it('should read from object', () => {
		const data = { one: 1, two: 2, three: 3 };
		const state = prepareState(data);
		const actual = state.one && state.two || state.three;

		expect(actual).toBe(2);
	});

	// TODO: test object updates
	// - object to new object
	// - object to undefined

	describe('updating values', () => {
		const updater = jest.fn();
		let state;

		beforeEach(() => {
			const data = { one: 1, two: 2, three: 3 };

			updater.mockClear();
			state = prepareState(data);
			state.one && state.two || state.three;
			Object.keys(data).forEach(key => state[key] = updater);
		});

		it('should update when read value is changed', () => {
			state.two = 4;

			expect(updater).toHaveBeenCalled();
			expect(state.two).toBe(4);
		});

		it('should not update when unread value is changed', () => {
			state.three = 9;

			expect(updater).not.toHaveBeenCalled();
			expect(state.three).toBe(9);
		});

		it('should not update when read value is not changed', () => {
			state.one = 1;

			expect(updater).not.toHaveBeenCalled();
			expect(state.one).toBe(1);
		});
	});
});
