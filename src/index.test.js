import stew, { execute, hotSwap } from '.';
import { virtualDocument } from './document';
import { processEffects } from './impulse';
import render from './view';

jest.mock('./document', () => ({
	virtualDocument: {},
	isServer: true,
}));

jest.mock('./impulse');
jest.mock('./view');

const createDocumentFragment = jest.fn();
const querySelector = jest.fn();
const ref = [];

beforeEach(() => {
	jest.clearAllMocks();
	createDocumentFragment.mockReturnValue({});
	querySelector.mockImplementation(tagName => ({ tagName }));
	Object.assign(virtualDocument, { createDocumentFragment, querySelector });
	render.mockReturnValue(ref);
});

describe('stew', () => {
	it('renders layout', () => {
		const node = { tagName: 'div' };
		const context = { lmno: 456 };
		const actual = stew(node, context, 'first', 'last');
		expect(actual).toBe(ref);
		expect(processEffects).toHaveBeenCalled();

		expect(render).toHaveBeenCalledWith(
			[node, {}, 'first', 'last'],
			context,
			virtualDocument,
			[node],
			['', {}],
			0,
			{},
		);
	});

	it('queries for node', () => {
		const node = { tagName: 'div' };
		const context = { lmno: 456 };
		const actual = stew('div', context, 'first', 'last');
		expect(actual).toBe(ref);
		expect(processEffects).toHaveBeenCalled();

		expect(render).toHaveBeenCalledWith(
			[node, {}, 'first', 'last'],
			context,
			virtualDocument,
			[node],
			['', {}],
			0,
			{},
		);
	});

	it('uses fragment', () => {
		const node = {};
		const context = { lmno: 456 };
		const actual = stew('', context, 'first', 'last');
		expect(actual).toBe(ref);
		expect(processEffects).toHaveBeenCalled();

		expect(render).toHaveBeenCalledWith(
			[node, {}, 'first', 'last'],
			context,
			virtualDocument,
			[node],
			['', {}],
			0,
			{},
		);
	});

	it('allows custom document', () => {
		const node = { tagName: 'body' };
		const customDocument = { createDocumentFragment, querySelector, body: node };
		const context = { lmno: 456 };
		const actual = stew(customDocument, context, 'first', 'last');
		expect(actual).toBe(ref);
		expect(processEffects).toHaveBeenCalled();

		expect(render).toHaveBeenCalledWith(
			[node, {}, 'first', 'last'],
			context,
			customDocument,
			[node],
			['', {}],
			0,
			{},
		);
	});

	it('allows custom document fragment', () => {
		const node = {};
		const customDocument = { createDocumentFragment, querySelector };
		const context = { lmno: 456 };
		const actual = stew(customDocument, context, 'first', 'last');
		expect(actual).toBe(ref);
		expect(processEffects).toHaveBeenCalled();

		expect(render).toHaveBeenCalledWith(
			[node, {}, 'first', 'last'],
			context,
			customDocument,
			[node],
			['', {}],
			0,
			{},
		);
	});
});
