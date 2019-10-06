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
			const actual = locate('...', '');
			expect(actual).toEqual(['...']);
		});

		it('element', () => {
			const actual = locate('...', 'br');
			expect(actual).toEqual(['<br>', '...']);
		});

		it('conditional', () => {
			const actual = locate('...', 'br', 0);
			expect(actual).toEqual(['<br data--="0">', '...']);
		});

		it('iterations', () => {
			const actual = locate('...', 'br', 1, 2);

			expect(actual).toEqual([
				'<br data--="1-0">', '<br data--="1-1">', '...'
			]);
		});
	});

	describe('hydrate', () => {
		it('text', () => {
			const actual = locate(text);
			expect(actual).toBe(0);
		});

		it('element', () => {
			const actual = locate(element);
			expect(actual).toBe(0);
		});

		it('conditional', () => {
			const actual = locate(conditional, 0);
			expect(actual).toBe(0);
		});

		it('iterations', () => {
			const actual = locate(iterations, 1);
			expect(actual).toBe(2);
		});

		it('missing', () => {
			const actual = locate(iterations, 0);
			expect(actual).toBeUndefined();
		});
	});

	describe('update', () => {
		it('text', () => {
			const actual = locate(text, '');
			expect(actual).toBe(text);
		});

		it('creates text', () => {
			const actual = locate(conditional, '');

			expect(actual).toEqual(text);
			expect(actual).not.toBe(text);
		});

		it('element', () => {
			const actual = locate(element, 'br');
			expect(actual).toBe(element);
		});

		it('creates element', () => {
			const actual = locate(conditional, 'br');

			expect(actual).toEqual(element);
			expect(actual).not.toBe(element);
		});

		it('conditional', () => {
			const actual = locate(conditional, 'br', 0);
			expect(actual).toBe(conditional);
		});

		it('creates conditional', () => {
			const actual = locate(element, 'br', 0);

			expect(actual).toEqual(conditional);
			expect(actual).not.toBe(conditional);
		});

		it('gathers iterations', () => {
			const actual = locate(iterations, 'br', 1, 2);
			expect(actual).toBe(iterations);
		});

		it('creates iterations', () => {
			const actual = locate(iterations, 'br', '1', 3);

			expect(actual).toMatchObject(element);
			expect(actual.getAttribute('data--')).toBe('1-2');
			expect(actual.previousSibling).toBe(iterations);
		});
	
		it('removes iterations', () => {
			const { previousSibling } = iterations;
			const actual = locate(iterations, 'br', '1', 1);

			expect(actual).toBe(previousSibling);
			expect(iterations.parentElement).toBe(null);
		});
	});
});
