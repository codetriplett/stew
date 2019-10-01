import { locate } from '../locate';

describe('locate', () => {
	let container;
	let text;
	let element;
	let conditional;
	let iterations;

	beforeEach(() => {
		container = document.createElement('br');
		container.innerHTML = '<br data--="1-0"><br data--="1-1">';
		iterations = container.lastChild;

		conditional = document.createElement('br');
		conditional.setAttribute('data--', '0');
		container.appendChild(conditional);

		element = document.createElement('br');
		container.appendChild(element);

		text = document.createTextNode('');
		container.appendChild(text);
	});

	it('locates text', () => {
		const actual = locate(text);
		expect(actual).toBe(text);
	});

	it('creates text', () => {
		container.removeChild(text);
		const actual = locate(conditional);
		expect(actual).toEqual(text);
	});

	it('locates element', () => {
		const actual = locate(element, 'br');
		expect(actual).toBe(element);
	});

	it('creates element', () => {
		container.removeChild(element);
		const actual = locate(conditional, 'br');
		expect(actual).toEqual(element);
	});

	it('locates conditional', () => {
		const actual = locate(conditional, 'br', '0');
		expect(actual).toBe(conditional);
	});

	it('creates conditional', () => {
		container.removeChild(element);
		const actual = locate(conditional, 'br', '0');
		expect(actual).toMatchObject(element);
		expect(actual.getAttribute('data--')).toBe('0');
	});

	it('locates iterations', () => {
		const actual = locate(iterations, 'br', '1', 2);
		expect(actual).toHaveLength(2);
		expect(actual[0]).toBe(iterations);
		expect(actual[1]).toBe(iterations.previousSibling);
	});

	it('creates iterations', () => {
		const actual = locate(iterations, 'br', '1', 3);
		expect(actual).toHaveLength(3);
		expect(actual[0]).toMatchObject(element);
		expect(actual[1]).toBe(iterations);
		expect(actual[2]).toBe(iterations.previousSibling);
	});
});
