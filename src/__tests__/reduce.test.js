import { reduce } from '../reduce';

describe('reduce', () => {
	it('reduces syncronously', () => {
		const actual = reduce(0, [
			(value, i) => `2.${i},${value}`,
			(value, i) => `1.${i},${value}`
		]);

		expect(actual).toBe('2.0,1.1,0');
	});

	it('reduces asyncronously', () => {
		reduce(0, [
			(value, i) => Promise.resolve(`2.${i},${value}`),
			(value, i) => Promise.resolve(`1.${i},${value}`)
		]).then(actual => {
			expect(actual).toBe('2.0,1.1,0');
		});
	});
});
