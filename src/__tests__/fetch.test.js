import { fetch } from '../fetch';

describe('fetch', () => {
	it('reads property', () => {
		const actual = fetch(['string'], { string: 'abc' });
		expect(actual).toBe('abc');
	});

	it('reads comparison', () => {
		const actual = fetch(['string', true, 'abc'], { string: 'abc' });
		expect(actual).toBe(true);
	});

	it('reads presence', () => {
		const actual = fetch(['string', true], { string: 'abc' });
		expect(actual).toBe(true);
	});

	it('reads absence', () => {
		const actual = fetch(['string', false], {});
		expect(actual).toBe(true);
	});

	it('writes property', () => {
		const state = {};
		fetch(['string'], state, 'abc');

		expect(state).toEqual({ string: 'abc'});
	});

	it('writes comparison', () => {
		const state = {};
		fetch(['string', true, 'abc'], state, 'abc');

		expect(state).toEqual({ string: 'abc' });
	});

	it('does not write presence', () => {
		const state = {};
		fetch(['string', true], state, 'abc');

		expect(state).toEqual({});
	});
});
