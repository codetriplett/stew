import { clean } from '../clean';

describe('clean', () => {
	it('literal', () => {
		const actual = clean('abc');
		expect(actual).toBe('abc');
	});

	it('object', () => {
		const actual = clean({ string: 'abc' });
		expect(actual).toEqual({ string: 'abc' });
	});
	
	it('empty properties', () => {
		const actual = clean({ string: 'abc', empty: {} });
		expect(actual).toEqual({ string: 'abc' });
	});
	
	it('empty object', () => {
		const actual = clean({ empty: {} });
		expect(actual).toBeUndefined();
	});

	it('array', () => {
		const actual = clean([{ string: 'abc' }, { string: 'xyz' }]);
		expect(actual).toEqual([{ string: 'abc' }, { string: 'xyz' }]);
	});

	it('empty items', () => {
		const actual = clean([{ string: 'abc' }, { empty: {} }]);
		expect(actual).toEqual([{ string: 'abc' }, undefined]);
	});

	it('empty array', () => {
		const actual = clean([{ empty: {} }, { empty: {} }]);
		expect(actual).toBeUndefined();
	});
});
