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

		it('ignores listeners', () => {
			const actual = evaluate(['key'], state, 'onclick');
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
			const element = new Text('abc');
			const actual = evaluate(['abc'], state, element);

			expect(state).toEqual({ '.': [update] });
			expect(actual).toBe(element);
		});

		it('resolves value', () => {
			const element = new Text('abc');
			const actual = evaluate([['key']], state, element);

			expect(state).toEqual({ '.': [update], key: 'abc' });
			expect(actual).toBe(element);
		});

		it('resolves string and string', () => {
			const element = new Text('abcxyz');
			const actual = evaluate(['abc', 'xyz'], state, element);

			expect(state).toEqual({ '.': [update] });
			expect(actual).toBe(element);
		});

		it('resolves string and value', () => {
			const element = new Text('xyzabc');
			const actual = evaluate(['xyz', ['key']], state, element);

			expect(state).toEqual({ '.': [update], key: 'abc' });
			expect(actual).toBe(element);
		});

		it('resolves string and match', () => {
			const element = new Text('xyz');
			const actual = evaluate(['xyz', ['key', 'abc']], state, element);

			expect(state).toEqual({ '.': [update], key: 'abc' });
			expect(actual).toBe(element);
		});

		it('resolves value and string', () => {
			const element = new Text('abcxyz');
			const actual = evaluate([['key'], 'xyz'], state, element);

			expect(state).toEqual({ '.': [update], key: 'abc' });
			expect(actual).toBe(element);
		});

		it('resolves value and value', () => {
			const element = new Text('abcabc');
			const actual = evaluate([['key'], ['key']], state, element);

			expect(state).toEqual({ '.': [update], key: 'abcabc' });
			expect(actual).toBe(element);
		});

		it('resolves value and match', () => {
			const element = new Text('abc');
			const actual = evaluate([['key'], ['key', 'abc']], state, element);

			expect(state).toEqual({ '.': [update], key: 'abc' });
			expect(actual).toBe(element);
		});

		it('resolves match and string', () => {
			const element = new Text('xyz');
			const actual = evaluate([['key', 'abc'], 'xyz'], state, element);

			expect(state).toEqual({ '.': [update], key: 'abc' });
			expect(actual).toBe(element);
		});

		it('resolves match and value', () => {
			const element = new Text('abc');
			const actual = evaluate([['key', 'abc'], ['key']], state, element);

			expect(state).toEqual({ '.': [update], key: 'abc' });
			expect(actual).toBe(element);
		});

		it('resolves match and match', () => {
			const element = new Text('abc');

			const actual = evaluate(
				[['key', 'abc'], ['key', 'abc']], state, element
			);

			expect(state).toEqual({ '.': [update], key: 'abc' });
			expect(actual).toBe(element);
		});

		it('reads value attribute', () => {
			const element = new Element('abc');
			const actual = evaluate([['key']], state, 'name', element);

			expect(state).toEqual({ '.': [update], key: 'abc' });
			expect(actual).toBe('name');
		});

		it('reads boolean attribute', () => {
			const element = new Element('');
			const actual = evaluate([['key', 'abc']], state, 'name', element);

			expect(state).toEqual({ '.': [update], key: 'abc' });
			expect(actual).toBe('name');
		});

		it('attaches listener', () => {
			const element = new Element('');
			const actual = evaluate([['key']], state, 'onclick', element);

			expect(state).toEqual({ '.': [update] });
			expect(element.onclick).toEqual(expect.any(Function));
			expect(actual).toBe('');
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
			const actual = evaluate([['key']], state, element);

			expect(element.nodeValue).toBe('xyz');
			expect(actual).toBe(element);
		});

		it('keeps content', () => {
			const element = new Text('xyz');
			const actual = evaluate([['key']], state, element);
			
			expect(element.nodeValue).toBe('xyz');
			expect(actual).toBe(element);
		});

		it('updates value attribute', () => {
			const element = new Element('abc');
			const actual = evaluate([['key']], state, 'name', element);
			
			expect(setAttribute).toHaveBeenCalledWith('name', 'xyz');
			expect(actual).toBe('');
		});

		it('keeps value attribute', () => {
			const element = new Element('xyz');
			const actual = evaluate([['key']], state, 'name', element);
			
			expect(setAttribute).not.toHaveBeenCalled();
			expect(actual).toBe('');
		});

		it('updates boolean attribute', () => {
			const element = new Element(null);
			const actual = evaluate([['key', 'xyz']], state, 'name', element);
			
			expect(toggleAttribute).toHaveBeenCalledWith('name', true);
			expect(actual).toBe('');
		});

		it('keeps boolean attribute', () => {
			const element = new Element('');
			const actual = evaluate([['key', 'xyz']], state, 'name', element);
			
			expect(toggleAttribute).not.toHaveBeenCalled();
			expect(actual).toBe('');
		});

		it('updates inactive attribute', () => {
			const element = new Element('');
			const actual = evaluate([['key', 'abc']], state, 'name', element);
			
			expect(removeAttribute).toHaveBeenCalledWith('name');
			expect(actual).toBe('');
		});

		it('keeps boolean attribute', () => {
			const element = new Element(null);
			const actual = evaluate([['key', 'abc']], state, 'name', element);
			
			expect(removeAttribute).not.toHaveBeenCalled();
			expect(actual).toBe('');
		});

		it('attaches listener', () => {
			const element = new Element('');
			const actual = evaluate([['key']], state, 'onclick', element);
			
			expect(element.onclick).toEqual(expect.any(Function));
			expect(actual).toBe('');
		});

		it('leaves previously attached listener', () => {
			const action = () => {};
			const element = new Element('');
			element.onclick = action;
			const actual = evaluate([['key']], state, 'onclick', element);

			expect(element.onclick).toBe(action);
			expect(actual).toBe('');
		});
	});
});
