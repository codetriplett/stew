import { compare } from './compare';

describe('compare', () => {
	it('compares identical strings', () => {
		const actual = compare('abc', 'abc');
		expect(actual).toEqual(true);
	});

	it('compares different strings', () => {
		const actual = compare('abc', 'xyz');
		expect(actual).toEqual(false);
	});

	it('compares identical objects', () => {
		const actual = compare({ key: 'same' }, { key: 'same' });
		expect(actual).toEqual(true);
	});

	it('compares different objects', () => {
		const actual = compare({ key: 'old' }, { key: 'new' });
		expect(actual).toEqual(false);
	});

	it('compares identical arrays', () => {
		const actual = compare(['same'], ['same']);
		expect(actual).toEqual(true);
	});

	it('compares different arrays', () => {
		const actual = compare(['old'], ['new']);
		expect(actual).toEqual(false);
	});

	it('compares different types', () => {
		const actual = compare('same', ['same']);
		expect(actual).toEqual(false);
	});
});
