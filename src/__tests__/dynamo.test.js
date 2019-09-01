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
	const state = {};

	beforeEach(() => {
		fetch.mockClear().mockImplementation((item, state) => {
			return state ? value : item === comparison;
		});

		render.mockClear().mockReturnValue(element);
	});

	it('adds nothing', () => {
		const actual = dynamo(state, []);
		expect(actual).toEqual([]);
	});

	it('adds text', () => {
		const actual = dynamo(state, [text]);
		expect(actual).toEqual([text]);
	});

	it('adds variable', () => {
		const actual = dynamo(state, [variable]);
		expect(actual).toEqual([value]);
	});

	it('adds element', () => {
		const actual = dynamo(state, [template]);
		expect(actual).toEqual([element]);
	});

	it('adds text before text', () => {
		const actual = dynamo(state, [text, text]);
		expect(actual).toEqual([text, text]);
	});

	it('adds value before text', () => {
		const actual = dynamo(state, [variable, text]);
		expect(actual).toEqual([value, text]);
	});

	it('adds element before text', () => {
		const actual = dynamo(state, [template, text]);
		expect(actual).toEqual([element, text]);
	});

	it('adds text before value', () => {
		const actual = dynamo(state, [text, variable]);
		expect(actual).toEqual([text, value]);
	});

	it('adds value before value', () => {
		const actual = dynamo(state, [variable, variable]);
		expect(actual).toEqual([value, value]);
	});

	it('adds element before value', () => {
		const actual = dynamo(state, [template, variable]);
		expect(actual).toEqual([element, value]);
	});

	it('adds text before element', () => {
		const actual = dynamo(state, [text, template]);
		expect(actual).toEqual([text, element]);
	});

	it('adds value before element', () => {
		const actual = dynamo(state, [variable, template]);
		expect(actual).toEqual([value, element]);
	});

	it('adds element before element', () => {
		const actual = dynamo(state, [template, template]);
		expect(actual).toEqual([element, element]);
	});
});
