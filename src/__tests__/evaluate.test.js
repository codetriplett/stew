import { evaluate } from '../evaluate';

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

describe('evaluate', () => {
	describe('generate', () => {
		let state;
	
		beforeEach(() => {
			state = { key: 'abc', '.': [{}] };
		});

		it('resolves string', () => {
			const actual = evaluate(['abc'], state);
			expect(actual).toBe('abc');
		});

		it('resolves value', () => {
			const actual = evaluate([['key']], state);
			expect(actual).toBe('abc');
		});

		it('resolves match', () => {
			const actual = evaluate([['key', 'abc']], state);
			expect(actual).toBe('');
		});

		it('resolves mismatch', () => {
			const actual = evaluate([['key', 'xyz']], state);
			expect(actual).toBe('');
		});

		it('resolves string and string', () => {
			const actual = evaluate(['abc', 'xyz'], state);
			expect(actual).toBe('abcxyz');
		});

		it('resolves string and value', () => {
			const actual = evaluate(['xyz', ['key']], state);
			expect(actual).toBe('xyzabc');
		});

		it('resolves string and match', () => {
			const actual = evaluate(['xyz', ['key', 'abc']], state);
			expect(actual).toBe('xyz');
		});

		it('resolves string and mismatch', () => {
			const actual = evaluate(['xyz', ['key', 'xyz']], state);
			expect(actual).toBe('');
		});

		it('resolves value and string', () => {
			const actual = evaluate([['key'], 'xyz'], state);
			expect(actual).toBe('abcxyz');
		});

		it('resolves value and value', () => {
			const actual = evaluate([['key'], ['key']], state);
			expect(actual).toBe('abcabc');
		});

		it('resolves value and match', () => {
			const actual = evaluate([['key'], ['key', 'abc']], state);
			expect(actual).toBe('abc');
		});

		it('resolves value and mismatch', () => {
			const actual = evaluate([['key'], ['key', 'xyz']], state);
			expect(actual).toBe('');
		});

		it('resolves match and string', () => {
			const actual = evaluate([['key', 'abc'], 'xyz'], state);
			expect(actual).toBe('xyz');
		});

		it('resolves match and value', () => {
			const actual = evaluate([['key', 'abc'], ['key']], state);
			expect(actual).toBe('abc');
		});

		it('resolves match and match', () => {
			const actual = evaluate([['key', 'abc'], ['key', 'abc']], state);
			expect(actual).toBe('');
		});

		it('resolves match and mismatch', () => {
			const actual = evaluate([['key', 'abc'], ['key', 'xyz']], state);
			expect(actual).toBe('');
		});

		it('resolves mismatch and string', () => {
			const actual = evaluate([['key', 'xyz'], 'xyz'], state);
			expect(actual).toBe('');
		});

		it('resolves mismatch and value', () => {
			const actual = evaluate([['key', 'xyz'], ['key']], state);
			expect(actual).toBe('');
		});

		it('resolves mismatch and match', () => {
			const actual = evaluate([['key', 'xyz'], ['key', 'abc']], state);
			expect(actual).toBe('');
		});

		it('resolves mismatch and mismatch', () => {
			const actual = evaluate([['key', 'xyz'], ['key', 'xyz']], state);
			expect(actual).toBe('');
		});

		it('resolves value attribute', () => {
			const actual = evaluate(['abc'], state, 'name');
			expect(actual).toBe(' name="abc"');
		});

		it('resolves boolean attribute', () => {
			const actual = evaluate([['key', 'abc']], state, 'name');
			expect(actual).toBe(' name');
		});

		it('ignores inactive attribute', () => {
			const actual = evaluate([['key', 'xyz']], state, 'name');
			expect(actual).toBe('');
		});
	});

	describe('hydrate', () => {
		const update = jest.fn();
		let state;

		beforeEach(() => {
			state = { '.': [update] };
		});

		it('resolves string', () => {
			evaluate(['abc'], state, new Text('abc'));
			expect(state).toEqual({ '.': [update] });
		});

		it('resolves value', () => {
			evaluate([['key']], state, new Text('abc'));
			expect(state).toEqual({ '.': [update], key: 'abc' });
		});

		it('resolves string and string', () => {
			evaluate(['abc', 'xyz'], state, new Text('abcxyz'));
			expect(state).toEqual({ '.': [update] });
		});

		it('resolves string and value', () => {
			evaluate(['xyz', ['key']], state, new Text('xyzabc'));
			expect(state).toEqual({ '.': [update], key: 'abc' });
		});

		it('resolves string and match', () => {
			evaluate(['xyz', ['key', 'abc']], state, new Text('xyz'));
			expect(state).toEqual({ '.': [update], key: 'abc' });
		});

		it('resolves value and string', () => {
			evaluate([['key'], 'xyz'], state, new Text('abcxyz'));
			expect(state).toEqual({ '.': [update], key: 'abc' });
		});

		it('resolves value and value', () => {
			evaluate([['key'], ['key']], state, new Text('abcabc'));
			expect(state).toEqual({ '.': [update], key: 'abcabc' });
		});

		it('resolves value and match', () => {
			evaluate([['key'], ['key', 'abc']], state, new Text('abc'));
			expect(state).toEqual({ '.': [update], key: 'abc' });
		});

		it('resolves match and string', () => {
			evaluate([['key', 'abc'], 'xyz'], state, new Text('xyz'));
			expect(state).toEqual({ '.': [update], key: 'abc' });
		});

		it('resolves match and value', () => {
			evaluate([['key', 'abc'], ['key']], state, new Text('abc'));
			expect(state).toEqual({ '.': [update], key: 'abc' });
		});

		it('resolves match and match', () => {
			evaluate([['key', 'abc'], ['key', 'abc']], state, new Text('abc'));
			expect(state).toEqual({ '.': [update], key: 'abc' });
		});

		it('reads value attribute', () => {
			evaluate([['key']], state, 'name', new Element('abc'));
			expect(state).toEqual({ '.': [update], key: 'abc' });
		});

		it('reads boolean attribute', () => {
			evaluate([['key', 'abc']], state, 'name', new Element(''));
			expect(state).toEqual({ '.': [update], key: 'abc' });
		});
	});

	describe('update', () => {
		const update = jest.fn();
		let state;
	
		beforeEach(() => {
			update[''] = true;
			state = { '.': [update], key: 'xyz' };
		});

		it('updates content', () => {
			const element = new Text('abc');
			evaluate([['key']], state, element);
			expect(element.nodeValue).toBe('xyz');
		});

		it('keeps content', () => {
			const element = new Text('xyz');
			evaluate([['key']], state, element);
			expect(element.nodeValue).toBe('xyz');
		});

		it('updates value attribute', () => {
			const element = new Element('abc');
			evaluate([['key']], state, 'name', element);
			expect(setAttribute).toHaveBeenCalledWith('name', 'xyz');
		});

		it('keeps value attribute', () => {
			const element = new Element('xyz');
			evaluate([['key']], state, 'name', element);
			expect(setAttribute).not.toHaveBeenCalled();
		});

		it('updates boolean attribute', () => {
			const element = new Element(null);
			evaluate([['key', 'xyz']], state, 'name', element);
			expect(toggleAttribute).toHaveBeenCalledWith('name', true);
		});

		it('keeps boolean attribute', () => {
			const element = new Element('');
			evaluate([['key', 'xyz']], state, 'name', element);
			expect(toggleAttribute).not.toHaveBeenCalled();
		});

		it('updates inactive attribute', () => {
			const element = new Element('');
			evaluate([['key', 'abc']], state, 'name', element);
			expect(removeAttribute).toHaveBeenCalledWith('name');
		});

		it('keeps boolean attribute', () => {
			const element = new Element(null);
			evaluate([['key', 'abc']], state, 'name', element);
			expect(removeAttribute).not.toHaveBeenCalled();
		});
	});
});
