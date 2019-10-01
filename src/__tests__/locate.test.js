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

	it('locates text', () => {
		const actual = locate(text);
		expect(actual).toBe(text);
	});

	it('creates text', () => {
		container.removeChild(text);
		const actual = locate(iterations);

		expect(actual).toEqual(text);
		expect(actual.parentElement).toBe(container);
	});

	it('locates element', () => {
		const actual = locate(element, 'br');
		expect(actual).toBe(element);
	});

	it('creates element', () => {
		container.removeChild(element);
		const actual = locate(conditional, 'br');

		expect(actual).toEqual(element);
		expect(actual.parentElement).toBe(container);
	});

	it('locates conditional', () => {
		const actual = locate(conditional, 'br', '0');
		expect(actual).toBe(conditional);
	});

	it('creates conditional', () => {
		container.removeChild(element);
		const actual = locate(text, 'br', '0');
		
		expect(actual).toMatchObject(element);
		expect(actual.getAttribute('data--')).toBe('0');
		expect(actual.parentElement).toBe(container);
	});

	it('locates iterations', () => {
		const actual = locate(iterations, 'br', '1', 2);

		expect(actual).toHaveLength(2);
		expect(actual[0]).toBe(iterations);
		expect(actual[1]).toBe(iterations.previousSibling);
	});

	it('creates iterations', () => {
		const sibling = iterations.previousSibling;
		const actual = locate(iterations, 'br', '1', 3);

		expect(actual).toHaveLength(3);
		expect(actual[0]).toMatchObject(element);
		expect(actual[0].getAttribute('data--')).toBe('1-2');
		expect(actual[0].parentElement).toBe(container);
		expect(actual[1]).toBe(iterations);
		expect(actual[2]).toBe(sibling);
	});

	it('removes iterations', () => {
		const sibling = iterations.previousSibling;
		const actual = locate(iterations, 'br', '1', 1);

		expect(actual).toHaveLength(1);
		expect(actual[0]).toBe(sibling);
	});
});
