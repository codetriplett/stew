import { compare } from './test';

describe('compare', () => {
	it('string match', () => {
		const actual = compare('abc', 'abc');
		expect(actual).toEqual(undefined);
	});
	
	it('string mismatch', () => {
		const actual = compare('abc', 'xyz');
		expect(actual).toEqual('abc, // xyz');
	});
	
	it('object match', () => {
		const actual = compare({ abc: 123 }, { abc: 123 });
		expect(actual).toEqual(undefined);
	});
	
	it('object mismatch', () => {
		const actual = compare({ abc: 123, lmno: 456 }, 'abc');
		expect(actual).toEqual(
`{
    abc: 123, // undefined
    ...(1),
    xyz: undefined, // 789
}`
		);
	});
	
	it.skip('array match', () => {
		const actual = compare([{ abc: 123 }], [{ abc: 789 }]);
		expect(actual).toEqual(undefined);
	});
	
	it('array mismatch', () => {
		const actual = compare([123], [789]);
		expect(actual).toEqual(
`[
    123, // 789
]`
		);
	});
});
