import { fetch } from '../fetch';
import { modify } from '../modify';
import { dynamo } from '../dynamo';

jest.mock('../fetch', () => ({ fetch: jest.fn() }));
jest.mock('../modify', () => ({ modify: jest.fn() }));

describe('dynamo', () => {
	const variable = ['key'];
	const match = ['key', true];
	const mismatch = ['key', false];
	const template = { '': ['img'] };
	const parameters = [{}, () => {}];

	beforeEach(() => {
		fetch.mockClear().mockImplementation((item, state) => {
			if (item.length > 1) {
				return state ? item[1] : true;
			}

			return state ? 'value' : false;
		});

		modify.mockClear().mockImplementation((item, name) => {
			return name ? ` ${name}` : 'content';
		});
	});
	
	it('renders tag', () => {
		const actual = dynamo(template, ...parameters);
		expect(actual).toBe('<img>');
	});

	it('renders attributes', () => {
		const actual = dynamo({
			'': ['img'], src: ['value'], alt: [''], width: [['key']]
		}, ...parameters);

		expect(actual).toBe('<img alt src width>');
	});

	it('renders children', () => {
		const actual = dynamo({
			'': ['div', '(', { '': ['p', 'value'] }, ')']
		}, ...parameters);
		
		expect(actual).toBe('<div>content</div>');
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
		expect(actual).toEqual(['<img>']);
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
		expect(actual).toEqual(['<img>', 'text']);
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
		expect(actual).toEqual(['<img>', 'value']);
	});

	it('adds text before element', () => {
		const actual = dynamo(['text', template], ...parameters);
		expect(actual).toEqual(['text', '<img>']);
	});

	it('adds value before element', () => {
		const actual = dynamo([variable, template], ...parameters);
		expect(actual).toEqual(['value', '<img>']);
	});

	it('adds element before element', () => {
		const actual = dynamo([template, template], ...parameters);
		expect(actual).toEqual(['<img>', '<img>']);
	});
	
	it('modifies content', () => {
		const actual = dynamo(['text', variable], '', ...parameters);

		expect(modify).toHaveBeenCalledWith(
			['text', 'value'], '', ...parameters.slice(1)
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
		expect(actual).toEqual(['<img>']);
	});

	it('denies content', () => {
		const actual = dynamo([template, mismatch], ...parameters);
		expect(actual).toEqual([false]);
	});
});
