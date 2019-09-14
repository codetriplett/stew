import { modify } from '../modify';

const addEventListener = jest.fn();
const hasAttribute = jest.fn();
const toggleAttribute = jest.fn();
const removeAttribute = jest.fn();
const getAttribute = jest.fn();
const setAttribute = jest.fn();

function prepare (value) {
	jest.clearAllMocks();
	hasAttribute.mockReturnValue(value !== null);
	getAttribute.mockReturnValue(value);

	return {
		addEventListener,
		hasAttribute,
		toggleAttribute,
		removeAttribute,
		getAttribute,
		setAttribute
	};
}

describe('modify', () => {
	describe('content', () => {
		it('accepts string', () => {
			const actual = modify('abc');
			expect(actual).toBe('abc');
		});

		it('rejects true', () => {
			const actual = modify(false);
			expect(actual).toBe('');
		});

		it('rejects false', () => {
			const actual = modify(true);
			expect(actual).toBe('');
		});

		it('updates element', () => {
			const element = { nodeValue: 'abc' };
			modify('xyz', element);

			expect(element.nodeValue).toBe('xyz');
		});
	});

	describe('attribute', () => {
		it('accepts string', () => {
			const actual = modify('abc', 'name');
			expect(actual).toBe(' name="abc"');
		});

		it('accepts true', () => {
			const actual = modify(true, 'name');
			expect(actual).toBe(' name');
		});

		it('rejects false', () => {
			const actual = modify(false, 'name');
			expect(actual).toBe('');
		});

		it('updates value', () => {
			const element = prepare('abc');
			modify('xyz', element, 'name');

			expect(setAttribute).toHaveBeenCalledWith('name', 'xyz');
		});

		it('keeps value', () => {
			const element = prepare('abc');
			modify('abc', element, 'name');

			expect(setAttribute).not.toHaveBeenCalled();
		});

		it('toggles on', () => {
			const element = prepare(null);
			modify(true, element, 'name');

			expect(toggleAttribute).toHaveBeenCalledWith('name', true);
		});

		it('keeps on', () => {
			const element = prepare('');
			modify(true, element, 'name');

			expect(toggleAttribute).not.toHaveBeenCalled();
		});

		it('toggles off', () => {
			const element = prepare('');
			modify(false, element, 'name');

			expect(removeAttribute).toHaveBeenCalledWith('name');
		});

		it('keeps off', () => {
			const element = prepare(null);
			modify(false, element, 'name');

			expect(removeAttribute).not.toHaveBeenCalled();
		});
	});

	describe('listener', () => {
		it('sets action', () => {
			const action = () => {};
			const element = prepare();
			modify(action, element, 'onclick');

			expect(addEventListener).toHaveBeenCalledWith('click', action);
		});
	});
});
