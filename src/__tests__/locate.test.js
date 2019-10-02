import { locate } from '../locate';

describe('locate', () => {
	let container;
	let text;
	let element;
	let conditional;
	let iterations;

	beforeEach(() => {
		container = document.createElement('div');
		container.innerHTML = '<br data--="1-0"><br data--="1-1">';
		iterations = container.lastChild;

		text = document.createTextNode('');
		container.appendChild(text);

		conditional = document.createElement('br');
		conditional.setAttribute('data--', '0');
		container.appendChild(conditional);

		element = document.createElement('br');
		container.appendChild(element);
	});

	it('first child', () => {
		container.innerHTML = '';
		const actual = locate({ parentElement: container }, 'br');

		expect(actual).toEqual(element);
		expect(actual.parentElement).toBe(container);
	});

	it('root element', () => {
		const actual = locate({}, 'br');

		expect(actual).toEqual(element);
		expect(actual.parentElement).toBe(null);
	});

	describe('generate', () => {
		it('text', () => {
			const actual = locate('...');
			expect(actual).toEqual(['', '...']);
		});

		it('element', () => {
			const actual = locate('...', 'br');
			expect(actual).toEqual(['<br', '...']);
		});

		it('conditional', () => {
			const actual = locate('...', 'br', 0);
			expect(actual).toEqual(['<br data--="0"', '...']);
		});

		it('iterations', () => {
			const actual = locate('...', 'br', 1, 2);

			expect(actual).toEqual([
				'<br data--="1-0"', '<br data--="1-1"', '...'
			]);
		});
	});

	describe('hydrate', () => {
		it('text', () => {
			const actual = locate(text);
			expect(actual).toBe(text);
		});

		it('element', () => {
			const actual = locate(element);
			expect(actual).toBe(element);
		});

		it('conditional', () => {
			const actual = locate(conditional);
			expect(actual).toBe(conditional);
		});

		it('iterations', () => {
			const actual = locate(iterations);
			const [first, second] = actual;
	
			expect(actual).toHaveLength(2);
			expect(first).toBe(iterations.previousSibling);
			expect(second).toBe(iterations);
		});
	});

	describe('update', () => {
		it('element', () => {
			const actual = locate(element, 'br');
			expect(actual).toBe(element);
		});

		it('conditional', () => {
			const actual = locate(conditional, 'br', 0);
			expect(actual).toBe(conditional);
		});

		it('iterations', () => {
			const actual = locate(iterations, 'br', 1, 2);
			const [first, second] = actual;
	
			expect(actual).toHaveLength(2);
			expect(first).toBe(iterations.previousSibling);
			expect(second).toBe(iterations);
		});

		it('creates iterations', () => {
			const sibling = iterations.previousSibling;
			const actual = locate(iterations, 'br', '1', 3);
			const [first, second, third] = actual;
	
			expect(actual).toHaveLength(3);
			expect(first).toBe(sibling);
			expect(second).toBe(iterations);
			expect(third).toMatchObject(element);
			expect(third.getAttribute('data--')).toBe('1-2');
			expect(third.parentElement).toBe(container);
		});
	
		it('removes iterations', () => {
			const sibling = iterations.previousSibling;
			const actual = locate(iterations, 'br', '1', 1);
			const [node] = actual;
	
			expect(actual).toHaveLength(1);
			expect(node).toBe(sibling);
		});
	});
});
