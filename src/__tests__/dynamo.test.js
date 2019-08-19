import { dynamo } from '../dynamo';

describe('dynamo', () => {
	it('returns string', () => {
		const actual = dynamo({}, 'val');
		expect(actual).toBe('val');
	});

	it('fetches variable', () => {
		const actual = dynamo({ obj: { str: 'val' } }, ['obj', 'str']);
		expect(actual).toBe('val');
	});

	it('fetches index', () => {
		const actual = dynamo({ '.': 1 }, ['.']);
		expect(actual).toBe(1);
	});

	it('fetches last index', () => {
		const actual = dynamo({ 'array': ['one', 'two'] }, ['array', '']);
		expect(actual).toBe(1);
	});

	it('checks presence', () => {
		const actual = dynamo({ str: 'val' }, ['str', true]);
		expect(actual).toBe(true);
	});

	it('checks presence of false', () => {
		const actual = dynamo({ str: false }, ['str', true]);
		expect(actual).toBe(false);
	});

	it('checks presence of undefined', () => {
		const actual = dynamo({ str: undefined }, ['str', true]);
		expect(actual).toBe(false);
	});

	it('checks absence', () => {
		const actual = dynamo({ str: 'val' }, ['str', false]);
		expect(actual).toBe(false);
	});

	it('checks absence of false', () => {
		const actual = dynamo({ str: false }, ['str', false]);
		expect(actual).toBe(true);
	});

	it('checks absence of undefined', () => {
		const actual = dynamo({ str: undefined }, ['str', false]);
		expect(actual).toBe(true);
	});

	it('checks equality with same value', () => {
		const actual = dynamo({ num: 1 }, ['num', true, 1]);
		expect(actual).toBe(true);
	});

	it('checks equality with different value', () => {
		const actual = dynamo({ num: 1 }, ['num', true, 2]);
		expect(actual).toBe(false);
	});

	it('checks inequality with different value', () => {
		const actual = dynamo({ num: 1 }, ['num', false, 2]);
		expect(actual).toBe(true);
	});

	it('checks inequality with same value', () => {
		const actual = dynamo({ num: 1 }, ['num', false, 1]);
		expect(actual).toBe(false);
	});

	it('checks inequality with same value', () => {
		const actual = dynamo({ num: 1 }, ['num', false, 1]);
		expect(actual).toBe(false);
	});

	it('concatenates string', () => {
		const actual = dynamo({ str: 'val' }, '(', ['str'], ')');
		expect(actual).toBe('(val)');
	});

	it('includes conditional string', () => {
		const actual = dynamo({ str: 'val' }, ['str', true], 'val');
		expect(actual).toBe('val');
	});

	it('ignores conditional string', () => {
		const actual = dynamo({ str: 'val' }, ['str', false], 'val');
		expect(actual).toBe('');
	});

	it('renders element', () => {
		const actual = dynamo({ str: 'val' }, { '': ['div', []] });
		expect(actual).toBe('<element>');
	});
});
