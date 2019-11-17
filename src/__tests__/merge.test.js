import { merge } from '../merge';

describe('merge', () => {
	const string = 'abc';
	const number = 123;
	const boolean = true;
	let object;
	let array;

	beforeEach(() => {
		object = { string: 'xyz', number: 789 };
		array = [123, 456];
	});

	it('replaces undefined', () => {
		const actual = merge(undefined, object);
		expect(actual).toBe(object);
	});

	it('replaces literal', () => {
		const actual = merge(string, number);
		expect(actual).toBe(number);
	});

	it('replaces array', () => {
		const actual = merge(array, [456, 789]);

		expect(actual).not.toBe(array);
		expect(actual).toEqual([456, 789]);
	});

	it('merges object', () => {
		const actual = merge(object, { string, boolean });

		expect(actual).toBe(object);

		expect(actual).toEqual({
			string: 'abc',
			number: 789,
			boolean: true
		});
	});
});
