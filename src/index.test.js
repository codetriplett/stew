import stew, { hotSwap } from '.';
import { virtualDocument } from './document';
import { processEffects, onRender } from './impulse';
import render from './view';
import * as stateModule from './state';

const schedule = jest.spyOn(stateModule, 'schedule');

jest.mock('./document', () => ({
	virtualDocument: {},
	isServer: false,
}));

// jest.mock('./impulse');
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

describe('hotSwap', () => {
	it.only('swaps callback', async () => {
		const prevChildCallback = () => {};
		const nextChildCallback = () => {};
		const prevCallback = () => {};
		const nextCallback = () => {};
		const childUpdate = jest.fn();
		const update = jest.fn();
		const childImpulse = [childUpdate, new Set(), undefined];
		const childImpulseRef = [prevChildCallback, {}, childImpulse];
		const impulse = [update, new Set(), childImpulseRef];
		const impulseRef = [prevCallback, {}, impulse];
		const manifest = new Map();
		childImpulse.push(impulse);
		manifest.set(prevChildCallback, nextChildCallback);
		manifest.set(prevCallback, nextCallback);

		const ref = ['div', {}, {},
			['span', {}],
			impulseRef,
			{ nodeValue: 'text' },
		];

		const actual = hotSwap(ref, manifest);
		await onRender();
		
		expect(actual).toEqual(new Set([impulse, childImpulse]));
		expect(impulseRef[0]).toEqual(nextCallback);
		expect(childImpulseRef[0]).toEqual(nextChildCallback);
		expect(schedule).toHaveBeenCalledWith(actual);
		expect(childUpdate).not.toHaveBeenCalled();
		expect(update).toHaveBeenCalled();
	});
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
