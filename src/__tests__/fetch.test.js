import { fetch } from '../fetch';

describe('fetch', () => {
	it('reads property', () => {
		const actual = fetch(['string'], { string: 'abc' });
		expect(actual).toBe('abc');
	});

	it('reads comparison', () => {
		const actual = fetch(['string', 'abc'], { string: 'abc' });
		expect(actual).toBe(true);
	});

	it('does not read boolean if not compared', () => {
		const actual = fetch(['boolean'], { boolean: true });
		expect(actual).toBeUndefined();
	});

	it('writes property', () => {
		const state = {};
		fetch(['string'], state, 'abc');

		expect(state).toEqual({ string: 'abc'});
	});

	it('writes comparison', () => {
		const state = {};
		fetch(['string', 'abc'], state, 'abc');

		expect(state).toEqual({ string: 'abc' });
	});

	it('does not write when false', () => {
		const state = {};
		fetch(['string', 'abc'], state, false);

		expect(state).toEqual({});
	});

	it('does not write when empty', () => {
		const state = {};
		fetch(['string', 'abc'], state, '');

		expect(state).toEqual({});
	});

	it('create toggle action', () => {
		const update = jest.fn();
		const state = { value: false };
		const action = fetch(['value'], state, 'onclick', update);

		expect(action).toEqual(expect.any(Function));
		
		action();

		expect(state.value).toBe(true);
		expect(update).toHaveBeenCalled();
	});
});
