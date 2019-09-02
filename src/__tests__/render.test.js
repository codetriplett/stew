import { dynamo } from '../dynamo';
import { render } from '../render';

jest.mock('../dynamo', () => ({ dynamo: jest.fn() }));

describe('render', () => {
	const parameters = ['first', 'second'];
	const state = {};

	beforeEach(() => {
		dynamo.mockClear().mockImplementation((expression, name) => {
			return name ? ` ${name}` : 'content';
		});
	});

	it('renders tag', () => {
		const actual = render({ '': ['br'] }, state);

		expect(dynamo).not.toHaveBeenCalled();
		expect(actual).toBe('<br>');
	});

	it('renders attributes', () => {
		const actual = render({
			'': ['img'], src: ['value'], alt: [''], width: [['key']]
		}, state, ...parameters);

		expect(dynamo.mock.calls).toEqual([
			[[''], 'alt', state, ...parameters],
			[['value'], 'src', state, ...parameters],
			[[['key']], 'width', state, ...parameters]
		]);

		expect(actual).toBe('<img alt src width>');
	});

	it('renders children', () => {
		const actual = render({
			'': ['div', '(', { '': ['p', 'value'] }, ')']
		}, state, ...parameters);

		expect(dynamo.mock.calls).toEqual([
			[['(', { '': ['p', 'value'] }, ')'], '', state, ...parameters]
		]);
		
		expect(actual).toBe('<div>content</div>');
	});
});
