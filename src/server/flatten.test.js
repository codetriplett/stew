import { flatten } from './flatten';

describe('flatten', () => {
	it('only includes strings', () => {
		const values = flatten([
			'abc',
			false,
			undefined,
			() => {},
			true,
			'xyz'
		]);

		expect(values).toEqual(['abc', 'xyz']);
	});

	it('processes child arrays', () => {
		const values = flatten([
			'abc',
			false,
			[
				undefined,
				'lmno',
				() => {},
			],
			true,
			'xyz'
		]);

		expect(values).toEqual(['abc', 'lmno', 'xyz']);
	});
});
