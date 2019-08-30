import { evaluate } from '../evaluate';

describe('evaluate', () => {
	it('returns string', () => {
		const actual = evaluate('abc', {});
		expect(actual).toBe('abc');
	});

	it('returns variable', () => {
		const actual = evaluate(['string'], { string: 'abc' });
		expect(actual).toBe('abc');
	});
});
