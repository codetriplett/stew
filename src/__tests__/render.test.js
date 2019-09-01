import { dynamo } from '../dynamo';
import { modify } from '../modify';
import { stitch } from '../stitch';
import { render } from '../render';

jest.mock('../dynamo', () => ({ dynamo: jest.fn() }));
jest.mock('../modify', () => ({ modify: jest.fn() }));
jest.mock('../stitch', () => ({ stitch: jest.fn() }));

describe('render', () => {
	const parameters = ['first', 'second'];
	const values = [];
	const state = {};

	beforeEach(() => {
		dynamo.mockClear().mockReturnValue(values);
		modify.mockClear().mockImplementation((values, name) => ` ${name}`);
		stitch.mockClear().mockReturnValue('content');
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
			[[''], state, ...parameters],
			[['value'], state, ...parameters],
			[[['key']], state, ...parameters]
		]);
		
		expect(modify.mock.calls).toEqual([
			[values, 'alt', ...parameters],
			[values, 'src', ...parameters],
			[values, 'width', ...parameters]
		]);

		expect(actual).toBe('<img alt src width>');
	});

	it('renders children', () => {
		const actual = render({
			'': ['div', '(', { '': ['p', 'value'] }, ')']
		}, state, ...parameters);

		expect(dynamo.mock.calls).toEqual([
			[['(', { '': ['p', 'value'] }, ')'], state, ...parameters]
		]);
		
		expect(stitch.mock.calls).toEqual([[values, ...parameters]]);
		expect(actual).toBe('<div>content</div>');
	});
});
