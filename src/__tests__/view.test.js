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
		const extract = view('data-flag?');
		const actual = extract(element);

		expect(actual).toBe(true);
	});

	it('should extract missing flag', () => {
		const extract = view('data-other?');
		const actual = extract(element);

		expect(actual).toBe(false);
	});

	it('should extract class', () => {
		const extract = view('.child', 'class');
		const actual = extract(container);

		expect(actual).toBe('alpha');
	});

	it('should extract content of child', () => {
		const extract = view('.child');
		const actual = extract(container);

		expect(actual).toBe('Lorem Ipsum');
	});

	it('should extract existance of child', () => {
		const extract = view('.child', '?');
		const actual = extract(container);

		expect(actual).toBe(true);
	});

	it('should extract properties', () => {
		const extract = view('.alpha', {
			attributes: {
				attribute: view('data-attribute')
			},
			flags: [view('data-flag?')],
			text: view(),
			key: 'other'
		});

		const actual = extract(container);

		expect(actual).toEqual({
			attributes: { attribute: 'value' },
			flags: [true],
			text: 'Lorem Ipsum',
			key: 'other'
		});
	});

	it('should extract from first available child', () => {
		const extract = view('.gamma', {
			key: 'missing'
		}, '.alpha', {
			key: 'present'
		}, '.beta', {
			key: 'ignored'
		});

		const actual = extract(container);

		expect(actual).toEqual({ key: 'present' });
	});

	it('should extract and transform', () => {
		const transform = jest.fn().mockImplementation((element, value) => {
			return `${value}.`;
		});

		const extract = view('span.*', transform);
		const actual = extract(container);

		expect(transform.mock.calls).toEqual([
			[element, 'Lorem Ipsum'],
			[container.querySelector('span:nth-child(2)'), 'Dolor Sit'],
		]);

		expect(actual).toEqual(['Lorem Ipsum.', 'Dolor Sit.']);
	});
});
