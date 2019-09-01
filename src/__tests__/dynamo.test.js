import { fetch } from '../fetch';
import { render } from '../render';
import { dynamo } from '../dynamo';

jest.mock('../fetch', () => ({ fetch: jest.fn() }));
jest.mock('../render', () => ({ render: jest.fn() }));

describe('dynamo', () => {
	const text = 'text';
	const variable = ['key'];
	const comparison = ['key', true];
	const template = { '': ['div'] };
	const value = 'value';
	const element = '<element>';
	const parameters = ['first', 'second'];

	beforeEach(() => {
		fetch.mockClear().mockImplementation((item, state) => {
			return state ? value : item === comparison;
		});

		render.mockClear().mockReturnValue(element);
	});

	it('adds text', () => {
		const actual = dynamo([text], ...parameters);

		expect(fetch).not.toHaveBeenCalled();
		expect(actual).toEqual([text]);
	});

	it('adds variable', () => {
		const actual = dynamo([variable], ...parameters);
		
		expect(fetch.mock.calls).toEqual([
			[variable],
			[variable, ...parameters]
		]);

		expect(actual).toEqual([value]);
	});

	it('adds element', () => {
		const actual = dynamo([template], ...parameters);
		
		expect(render).toHaveBeenCalledWith(template, ...parameters);
		expect(actual).toEqual([element]);
	});

	it('adds text before text', () => {
		const actual = dynamo([text, text], ...parameters);
		expect(actual).toEqual([text, text]);
	});

	it('adds value before text', () => {
		const actual = dynamo([variable, text], ...parameters);
		expect(actual).toEqual([value, text]);
	});

	it('adds element before text', () => {
		const actual = dynamo([template, text], ...parameters);
		expect(actual).toEqual([element, text]);
	});

	it('adds text before value', () => {
		const actual = dynamo([text, variable], ...parameters);
		expect(actual).toEqual([text, value]);
	});

	it('adds value before value', () => {
		const actual = dynamo([variable, variable], ...parameters);
		expect(actual).toEqual([value, value]);
	});

	it('adds element before value', () => {
		const actual = dynamo([template, variable], ...parameters);
		expect(actual).toEqual([element, value]);
	});

	it('adds text before element', () => {
		const actual = dynamo([text, template], ...parameters);
		expect(actual).toEqual([text, element]);
	});

	it('adds value before element', () => {
		const actual = dynamo([variable, template], ...parameters);
		expect(actual).toEqual([value, element]);
	});

	it('adds element before element', () => {
		const actual = dynamo([template, template], ...parameters);
		expect(actual).toEqual([element, element]);
	});
});
