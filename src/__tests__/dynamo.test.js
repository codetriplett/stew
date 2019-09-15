import { dynamo } from '../dynamo';

const addEventListener = jest.fn();
const hasAttribute = jest.fn();
const toggleAttribute = jest.fn();
const removeAttribute = jest.fn();
const getAttribute = jest.fn();
const setAttribute = jest.fn();

function Text (value) {
	this.nodeValue = value;
}

function Element (value) {
	jest.clearAllMocks();
	hasAttribute.mockReturnValue(value !== null);
	getAttribute.mockReturnValue(value);

	Object.assign(this, {
		addEventListener,
		hasAttribute,
		toggleAttribute,
		removeAttribute,
		getAttribute,
		setAttribute
	});
}

describe('dynamo', () => {
	describe('generate', () => {
		let state;
	
		beforeEach(() => {
			state = { key: 'abc' };
		});

		it('resolves string', () => {
			const actual = dynamo(['abc'], state, {});
			expect(actual).toBe('abc');
		});

		it('resolves value', () => {
			const actual = dynamo([['key']], state, {});
			expect(actual).toBe('abc');
		});

		it('resolves match', () => {
			const actual = dynamo([['key', 'abc']], state, {});
			expect(actual).toBe('');
		});

		it('resolves mismatch', () => {
			const actual = dynamo([['key', 'xyz']], state, {});
			expect(actual).toBe('');
		});

		it('resolves string and string', () => {
			const actual = dynamo(['abc', 'xyz'], state, {});
			expect(actual).toBe('abcxyz');
		});

		it('resolves string and value', () => {
			const actual = dynamo(['xyz', ['key']], state, {});
			expect(actual).toBe('xyzabc');
		});

		it('resolves string and match', () => {
			const actual = dynamo(['xyz', ['key', 'abc']], state, {});
			expect(actual).toBe('xyz');
		});

		it('resolves string and mismatch', () => {
			const actual = dynamo(['xyz', ['key', 'xyz']], state, {});
			expect(actual).toBe('');
		});

		it('resolves value and string', () => {
			const actual = dynamo([['key'], 'xyz'], state, {});
			expect(actual).toBe('abcxyz');
		});

		it('resolves value and value', () => {
			const actual = dynamo([['key'], ['key']], state, {});
			expect(actual).toBe('abcabc');
		});

		it('resolves value and match', () => {
			const actual = dynamo([['key'], ['key', 'abc']], state, {});
			expect(actual).toBe('abc');
		});

		it('resolves value and mismatch', () => {
			const actual = dynamo([['key'], ['key', 'xyz']], state, {});
			expect(actual).toBe('');
		});

		it('resolves match and string', () => {
			const actual = dynamo([['key', 'abc'], 'xyz'], state, {});
			expect(actual).toBe('xyz');
		});

		it('resolves match and value', () => {
			const actual = dynamo([['key', 'abc'], ['key']], state, {});
			expect(actual).toBe('abc');
		});

		it('resolves match and match', () => {
			const actual = dynamo([['key', 'abc'], ['key', 'abc']], state, {});
			expect(actual).toBe('');
		});

		it('resolves match and mismatch', () => {
			const actual = dynamo([['key', 'abc'], ['key', 'xyz']], state, {});
			expect(actual).toBe('');
		});

		it('resolves mismatch and string', () => {
			const actual = dynamo([['key', 'xyz'], 'xyz'], state, {});
			expect(actual).toBe('');
		});

		it('resolves mismatch and value', () => {
			const actual = dynamo([['key', 'xyz'], ['key']], state, {});
			expect(actual).toBe('');
		});

		it('resolves mismatch and match', () => {
			const actual = dynamo([['key', 'xyz'], ['key', 'abc']], state, {});
			expect(actual).toBe('');
		});

		it('resolves mismatch and mismatch', () => {
			const actual = dynamo([['key', 'xyz'], ['key', 'xyz']], state, {});
			expect(actual).toBe('');
		});

		it('resolves value attribute', () => {
			const actual = dynamo(['abc'], state, {}, 'name');
			expect(actual).toBe(' name="abc"');
		});

		it('resolves boolean attribute', () => {
			const actual = dynamo([['key', 'abc']], state, {}, 'name');
			expect(actual).toBe(' name');
		});

		it('ignores inactive attribute', () => {
			const actual = dynamo([['key', 'xyz']], state, {}, 'name');
			expect(actual).toBe('');
		});
	});

	describe('hydrate', () => {
		let state;

		beforeEach(() => {
			state = {};
		});

		it('resolves string', () => {
			dynamo(['abc'], state, new Text('abc'));
			expect(state).toEqual({});
		});

		it('resolves value', () => {
			dynamo([['key']], state, new Text('abc'));
			expect(state).toEqual({ key: 'abc' });
		});

		it('resolves string and string', () => {
			dynamo(['abc', 'xyz'], state, new Text('abcxyz'));
			expect(state).toEqual({});
		});

		it('resolves string and value', () => {
			dynamo(['xyz', ['key']], state, new Text('xyzabc'));
			expect(state).toEqual({ key: 'abc' });
		});

		it('resolves string and match', () => {
			dynamo(['xyz', ['key', 'abc']], state, new Text('xyz'));
			expect(state).toEqual({ key: 'abc' });
		});

		it('resolves value and string', () => {
			dynamo([['key'], 'xyz'], state, new Text('abcxyz'));
			expect(state).toEqual({ key: 'abc' });
		});

		it('resolves value and value', () => {
			dynamo([['key'], ['key']], state, new Text('abcabc'));
			expect(state).toEqual({ key: 'abcabc' });
		});

		it('resolves value and match', () => {
			dynamo([['key'], ['key', 'abc']], state, new Text('abc'));
			expect(state).toEqual({ key: 'abc' });
		});

		it('resolves match and string', () => {
			dynamo([['key', 'abc'], 'xyz'], state, new Text('xyz'));
			expect(state).toEqual({ key: 'abc' });
		});

		it('resolves match and value', () => {
			dynamo([['key', 'abc'], ['key']], state, new Text('abc'));
			expect(state).toEqual({ key: 'abc' });
		});

		it('resolves match and match', () => {
			dynamo([['key', 'abc'], ['key', 'abc']], state, new Text('abc'));
			expect(state).toEqual({ key: 'abc' });
		});

		it('reads value attribute', () => {
			dynamo([['key']], state, new Element('abc'), 'name');
			expect(state).toEqual({ key: 'abc' });
		});

		it('reads boolean attribute', () => {
			dynamo([['key', 'abc']], state, new Element(''), 'name');
			expect(state).toEqual({ key: 'abc' });
		});
	});

	describe('update', () => {
		let state;
	
		beforeEach(() => {
			state = { key: 'xyz', '.dispatch': () => {} };
		});

		it('updates content', () => {
			const element = new Text('abc');
			dynamo([['key']], state, element);
			expect(element.nodeValue).toBe('xyz');
		});

		it('keeps content', () => {
			const element = new Text('xyz');
			dynamo([['key']], state, element);
			expect(element.nodeValue).toBe('xyz');
		});

		it('updates value attribute', () => {
			const element = new Element('abc');
			dynamo([['key']], state, element, 'name');
			expect(setAttribute).toHaveBeenCalledWith('name', 'xyz');
		});

		it('keeps value attribute', () => {
			const element = new Element('xyz');
			dynamo([['key']], state, element, 'name');
			expect(setAttribute).not.toHaveBeenCalled();
		});

		it('updates boolean attribute', () => {
			const element = new Element(null);
			dynamo([['key', 'xyz']], state, element, 'name');
			expect(toggleAttribute).toHaveBeenCalledWith('name', true);
		});

		it('keeps boolean attribute', () => {
			const element = new Element('');
			dynamo([['key', 'xyz']], state, element, 'name');
			expect(toggleAttribute).not.toHaveBeenCalled();
		});

		it('updates inactive attribute', () => {
			const element = new Element('');
			dynamo([['key', 'abc']], state, element, 'name');
			expect(removeAttribute).toHaveBeenCalledWith('name');
		});

		it('keeps boolean attribute', () => {
			const element = new Element(null);
			dynamo([['key', 'abc']], state, element, 'name');
			expect(removeAttribute).not.toHaveBeenCalled();
		});
	});
});
