import { state } from '../state';

describe('state', () => {
	const render = jest.fn();
	let actual;

	beforeEach(() => {
		render.mockClear();

		actual = state({ one: 1, two: 2, three: 3 });
		actual.one && actual.two || actual.three;
		
		Object.keys(actual).forEach(key => actual[key] = render);
	});

	it('should update when read value is changed', () => {
		actual.two = 4;

		expect(render).toHaveBeenCalled();
		expect(actual.two).toBe(4);
	});

	it('should update when read value is changed', () => {
		actual.two = { value: 2 };

		expect(render).toHaveBeenCalled();
		expect(actual.two).toEqual({ value: 2 });

		render.mockClear();
		actual.two.value;
		actual.two.value = render;
		actual.two.value = 4;
		
		expect(render).toHaveBeenCalled();
		expect(actual.two).toEqual({ value: 4 });
	});

	it('should not update when unread value is changed', () => {
		actual.three = 9;

		expect(render).not.toHaveBeenCalled();
		expect(actual.three).toBe(9);
	});

	it('should not update when read value is not changed', () => {
		actual.one = 1;

		expect(render).not.toHaveBeenCalled();
		expect(actual.one).toBe(1);
	});
});
