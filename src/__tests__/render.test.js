import { dynamo } from '../dynamo';
import { render } from '../render';

jest.mock('../dynamo');

describe('render', () => {
	const state = {};

	beforeEach(() => {
		jest.clearAllMocks();
		dynamo.mockReturnValue('content');
	});

	it('renders tag', () => {
		const actual = render({ '': ['br'] }, state);
		expect(actual).toBe('<br>');
	});

	it('renders attributes', () => {
		const actual = render({
			'': ['img'], src: 'value', alt: '', width: ['key']
		}, state);

		expect(dynamo.mock.calls).toEqual([[state, 'key']]);
		expect(actual).toBe('<img alt="" src="value" width="content">');
	});

	it('renders children', () => {
		const actual = render({
			'': ['div', '(', { '': ['p', 'value'] }, ')']
		}, state);

		expect(dynamo.mock.calls).toEqual([
			[state, '(', { '': ['p', 'value'] }, ')']
		]);

		expect(actual).toBe('<div>content</div>');
	});
});
