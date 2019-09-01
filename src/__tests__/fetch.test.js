import { fetch } from '../fetch';

describe('fetch', () => {
	const register = jest.fn();
	let state;

	beforeEach(() => {
		register.mockClear();
		state = {};
	});
	
	it('detects no compare', () => {
		const actual = fetch(['string']);
		expect(actual).toBe(false);
	});

	it('detects compare', () => {
		const actual = fetch(['string', true]);
		expect(actual).toBe(true);
	});

	it('reads property', () => {
		const actual = fetch(['string'], { string: 'abc' });
		expect(actual).toBe('abc');
	});
	
	it('writes property', () => {
		fetch(['string'], state, 'abc');
		expect(state).toEqual({ string: 'abc' });
	});
	
	it('registers action', () => {
		fetch(['string'], state, register);
		expect(register).toHaveBeenCalledWith(state, 'string');
	});
});
