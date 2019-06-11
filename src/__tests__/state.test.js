import { state } from '../state';

describe('state', () => {
	it('should read from object', () => {
		const actual = state({ one: 1, two: 2, three: 3 });
		const value = actual.one && actual.two || actual.three;

		expect(value).toBe(2);
	});

	describe('updating values', () => {
		const updater = jest.fn();
		let actual;

		beforeEach(() => {
			const data = { one: 1, two: 2, three: 3 };

			updater.mockClear();
			actual = state(data);
			actual.one && actual.two || actual.three;
			
			Object.keys(data).forEach(key => actual[key] = updater);
		});

		it('should update when read value is changed', () => {
			actual.two = 4;

			expect(updater).toHaveBeenCalled();
			expect(actual.two).toBe(4);
		});

		it('should not update when unread value is changed', () => {
			actual.three = 9;

			expect(updater).not.toHaveBeenCalled();
			expect(actual.three).toBe(9);
		});

		it('should not update when read value is not changed', () => {
			actual.one = 1;

			expect(updater).not.toHaveBeenCalled();
			expect(actual.one).toBe(1);
		});
	});
});
