import { evaluate } from '../evaluate';
import { render } from '../render';
import { dynamo } from '../dynamo';

jest.mock('../evaluate');
jest.mock('../render');

describe('dynamo', () => {
	const state = {};

	beforeEach(() => {
		jest.clearAllMocks();
		evaluate.mockReturnValue('text');
		render.mockReturnValue('<element>');
	});

	it('processes single expression', () => {
		const actual = dynamo(state, ['expression']);

		expect(evaluate.mock.calls).toEqual([[['expression'], state]]);
		expect(render).not.toHaveBeenCalled();
		expect(actual).toBe('text');
	});

	it('processes single template', () => {
		const actual = dynamo(state, { '': 'template' });

		expect(evaluate).not.toHaveBeenCalled();
		expect(render.mock.calls).toEqual([[{ '': 'template' }, state]]);
		expect(actual).toBe('<element>');
	});

	it('processes combination', () => {
		const actual = dynamo(state, ['one'], { '': 'two' }, ['three']);

		expect(evaluate.mock.calls).toEqual([
			[['one'], state],
			[['three'], state]
		]);

		expect(render.mock.calls).toEqual([[{ '': 'two' }, state]]);
		expect(actual).toBe('text<element>text');
	});
});
