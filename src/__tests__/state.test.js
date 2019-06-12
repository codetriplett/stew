import { state } from '../state';

describe('state', () => {
	const updater = jest.fn();
	let object;

	beforeEach(() => {
		updater.mockClear();

		object = { one: 1, two: 2, three: 3 };
		state(object);
		object.one && object.two || object.three;
		
		Object.keys(object).forEach(key => object[key] = updater);
	});

	it('should update when read value is changed', () => {
		object.two = 4;

		expect(updater).toHaveBeenCalled();
		expect(object.two).toBe(4);
	});

	it('should update to an object', () => {
		object.two = { value: 2 };

		expect(updater).toHaveBeenCalled();
		expect(object.two).toEqual({ value: 2 });

		updater.mockClear();
		object.two.value;
		object.two.value = updater;
		object.two.value = 4;
		
		expect(updater).toHaveBeenCalled();
		expect(object.two).toEqual({ value: 4 });
	});

	it('should not update when unread value is changed', () => {
		object.three = 9;

		expect(updater).not.toHaveBeenCalled();
		expect(object.three).toBe(9);
	});

	it('should not update when read value is not changed', () => {
		object.one = 1;

		expect(updater).not.toHaveBeenCalled();
		expect(object.one).toBe(1);
	});
});
