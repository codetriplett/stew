import { state } from '../state';

describe('state', () => {
	const resolve = jest.fn();
	let set;

	beforeEach(() => {
		resolve.mockClear();
		set = new Set([resolve]);
	});

	it('should not resolve if value is the same', () => {
		const actual = state('value', set, 'value');

		expect(resolve).not.toHaveBeenCalled();
		expect(actual).toBe('value');
	});

	it('should resolve if value is the same', () => {
		const actual = state('new', set, 'old');

		expect(resolve).toHaveBeenCalled();
		expect(actual).toBe('new');
	});

	it('should add resolve to set', () => {
		set = new Set();

		const actual = state(resolve, set, 'value');

		expect(set).toEqual(new Set([resolve]));
		expect(actual).toBe('value');
	});

	it('should add another resolve to set', () => {
		set = new Set();
		state(resolve, set, 'value');

		const another = () => {};
		const actual = state(another, set, 'value');

		expect(set).toEqual(new Set([resolve, another]));
		expect(actual).toBe('value');
	});

	it('should delete one resolve from set', () => {
		const another = () => {};

		set = new Set();
		state(resolve, set, 'value');
		state(another, set, 'value');

		const actual = state(another, set, 'value');

		expect(set).toEqual(new Set([resolve]));
		expect(actual).toBe('value');
	});

	it('should delete resolve from set', () => {
		const actual = state(resolve, set, 'value');

		expect(set).toEqual(new Set());
		expect(actual).toBeUndefined();
	});
});
