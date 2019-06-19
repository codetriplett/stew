import { view } from '../view';

describe('view', () => {
	let container;
	let element;

	beforeEach(() => {
		container = document.createElement('div');

		container.innerHTML = `<span
			class="child alpha"
			data-attribute="value"
			data-flag>Lorem Ipsum</span><span
			class="child beta"
			data-attribute="value"
			data-flag>Dolor Sit</span>`;

		element = container.querySelector('span');
	});

	it('should extract content', () => {
		const extract = view();
		const actual = extract(element);

		expect(actual).toBe('Lorem Ipsum');
	});

	it('should extract attribute', () => {
		const extract = view('data-attribute');
		const actual = extract(element);

		expect(actual).toBe('value');
	});

	it('should extract missing attribute', () => {
		const extract = view('data-other');
		const actual = extract(element);

		expect(actual).toBe('');
	});

	it('should extract flag', () => {
		const extract = view('data-flag').asBoolean;
		const actual = extract(element);

		expect(actual).toBe(true);
	});

	it('should extract missing flag', () => {
		const extract = view('data-other').asBoolean;
		const actual = extract(element);

		expect(actual).toBe(false);
	});

	it('should extract class', () => {
		const extract = view('.child', 'class');
		const actual = extract(container);

		expect(actual).toBe('alpha');
	});

	it('should extract from child', () => {
		const extract = view('.child');
		const actual = extract(container);

		expect(actual).toBe('Lorem Ipsum');
	});

	it('should extract from children', () => {
		const extract = view('span.').asArray;
		const actual = extract(container);

		expect(actual).toEqual(['Lorem Ipsum', 'Dolor Sit']);
	});

	it('should extract and transform', () => {
		const transform = jest.fn().mockImplementation(value => `${value}.`);
		const extract = view('span.', transform).asArray;
		const actual = extract(container);

		expect(transform.mock.calls).toEqual([
			['Lorem Ipsum', element],
			['Dolor Sit', container.querySelector('span:nth-child(2)')],
		]);

		expect(actual).toEqual(['Lorem Ipsum.', 'Dolor Sit.']);
	});

	it('should extract and resolve', () => {
		const resolve = jest.fn().mockImplementation(value => `${value}.`);
		const extract = view('span.');
		const actual = extract(container, resolve);

		expect(resolve.mock.calls).toEqual([
			['Lorem Ipsum', element],
			['Dolor Sit', container.querySelector('span:nth-child(2)')],
		]);

		expect(actual).toEqual(['Lorem Ipsum.', 'Dolor Sit.']);
	});
});
