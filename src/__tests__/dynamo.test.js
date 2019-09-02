import { fetch } from '../fetch';
import { render } from '../render';
import { modify } from '../modify';
import { dynamo } from '../dynamo';

jest.mock('../fetch', () => ({ fetch: jest.fn() }));
jest.mock('../render', () => ({ render: jest.fn() }));
jest.mock('../modify', () => ({ modify: jest.fn() }));

describe('dynamo', () => {
	const variable = ['key'];
	const match = ['key', true];
	const mismatch = ['key', false];
	const template = { '': ['div'] };
	const parameters = [{}, () => {}];

	beforeEach(() => {
		fetch.mockClear().mockImplementation((item, state) => {
			if (item.length > 1) {
				return state ? item[1] : true;
			}

			return state ? 'value' : false;
		});

		render.mockClear().mockReturnValue('element');
		modify.mockClear().mockReturnValue('content');
	});

	it('adds text', () => {
		const actual = dynamo(['text'], ...parameters);

		expect(fetch).not.toHaveBeenCalled();
		expect(actual).toEqual(['text']);
	});

	it('adds variable', () => {
		const actual = dynamo([variable], ...parameters);
		
		expect(fetch.mock.calls).toEqual([
			[variable],
			[variable, ...parameters]
		]);

		expect(actual).toEqual(['value']);
	});

	it('adds element', () => {
		const actual = dynamo([template], ...parameters);
		
		expect(render).toHaveBeenCalledWith(template, ...parameters);
		expect(actual).toEqual(['element']);
	});

	it('adds text before text', () => {
		const actual = dynamo(['text', 'text'], ...parameters);
		expect(actual).toEqual(['text', 'text']);
	});

	it('adds value before text', () => {
		const actual = dynamo([variable, 'text'], ...parameters);
		expect(actual).toEqual(['value', 'text']);
	});

	it('adds element before text', () => {
		const actual = dynamo([template, 'text'], ...parameters);
		expect(actual).toEqual(['element', 'text']);
	});

	it('adds text before value', () => {
		const actual = dynamo(['text', variable], ...parameters);
		expect(actual).toEqual(['text', 'value']);
	});

	it('adds value before value', () => {
		const actual = dynamo([variable, variable], ...parameters);
		expect(actual).toEqual(['value', 'value']);
	});

	it('adds element before value', () => {
		const actual = dynamo([template, variable], ...parameters);
		expect(actual).toEqual(['element', 'value']);
	});

	it('adds text before element', () => {
		const actual = dynamo(['text', template], ...parameters);
		expect(actual).toEqual(['text', 'element']);
	});

	it('adds value before element', () => {
		const actual = dynamo([variable, template], ...parameters);
		expect(actual).toEqual(['value', 'element']);
	});

	it('adds element before element', () => {
		const actual = dynamo([template, template], ...parameters);
		expect(actual).toEqual(['element', 'element']);
	});
	
	it('modifies content', () => {
		const actual = dynamo(['text', variable], 'name', ...parameters);

		expect(modify).toHaveBeenCalledWith(
			['text', 'value'], 'name', ...parameters.slice(1)
		);

		expect(actual).toBe('content');
	});

	it('accepts expression', () => {
		const actual = dynamo([variable, match], ...parameters);

		expect(fetch.mock.calls).toEqual([
			[match],
			[match, ...parameters],
			[variable],
			[variable, ...parameters]
		]);

		expect(actual).toEqual(['value']);
	});

	it('returns true', () => {
		const actual = dynamo([match, match], ...parameters);

		expect(fetch.mock.calls).toEqual([
			[match],
			[match, ...parameters],
			[match],
			[match, ...parameters]
		]);

		expect(actual).toEqual([true]);
	});

	it('denies expression', () => {
		const actual = dynamo([variable, mismatch], ...parameters);

		expect(fetch.mock.calls).toEqual([
			[mismatch],
			[mismatch, ...parameters]
		]);

		expect(actual).toEqual([false]);
	});

	it('accepts section', () => {
		const actual = dynamo([match, 'text'], ...parameters);

		expect(fetch.mock.calls).toEqual([
			[match],
			[match, ...parameters]
		]);

		expect(actual).toEqual(['text']);
	});

	it('denies section', () => {
		const actual = dynamo([match, mismatch, 'text'], ...parameters);

		expect(fetch.mock.calls).toEqual([
			[mismatch],
			[mismatch, ...parameters],
			[match]
		]);

		expect(actual).toEqual(['']);
	});

	it('accepts content', () => {
		const actual = dynamo([template, match], ...parameters);
		expect(actual).toEqual(['element']);
	});

	it('denies content', () => {
		const actual = dynamo([template, mismatch], ...parameters);
		expect(actual).toEqual([false]);
	});
});
