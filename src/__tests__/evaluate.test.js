import { evaluate } from '../evaluate';

describe('evaluate', () => {
	it('reads value', () => {
		const actual = evaluate(['string'], { string: 'abc' });
		expect(actual).toBe('abc');
	});

	it('reads comparison', () => {
		const actual = evaluate(['string', 'abc'], { string: 'abc' });
		expect(actual).toBe(true);
	});

	it('does not read boolean if not compared', () => {
		const actual = evaluate(['boolean'], { boolean: true });
		expect(actual).toBeUndefined();
	});

	it('writes value', () => {
		const state = {};
		const actual = evaluate(['string'], state, 'abc');

		expect(state).toEqual({ string: 'abc' });
		expect(actual).toBe('abc');
	});

	it('writes comparison', () => {
		const state = {};
		const actual = evaluate(['string', 'abc'], state, 'abc');

		expect(state).toEqual({ string: 'abc' });
		expect(actual).toBe('abc');
	});

	it('writes suffix', () => {
		const state = {};
		const actual = evaluate(['string'], state, 'abcxyz', ['abc']);

		expect(state).toEqual({ string: 'xyz'});
		expect(actual).toBe('xyz');
	});

	it('writes alternate suffix', () => {
		const state = {};
		const actual = evaluate(['string'], state, 'abcxyz', ['cba', 'abc']);

		expect(state).toEqual({ string: 'xyz'});
		expect(actual).toBe('xyz');
	});

	it('does not write when false', () => {
		const state = {};
		const actual = evaluate(['string', 'abc'], state, false);

		expect(state).toEqual({});
		expect(actual).toBe(false);
	});

	it('does not write when empty', () => {
		const state = {};
		const actual = evaluate(['string', 'abc'], state, '');

		expect(state).toEqual({});
		expect(actual).toBe(false);
	});

	it('create toggle action', () => {
		const update = jest.fn();
		const state = { value: false };
		const action = evaluate(['value'], state, 'onclick', update);

		expect(action).toEqual(expect.any(Function));
		
		action();

		expect(state.value).toBe(true);
		expect(update).toHaveBeenCalled();
	});
});
