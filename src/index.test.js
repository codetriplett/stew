import stew, { hotSwapStep } from '.';
import { compile } from './program';
import { effects, processMemo } from './impulse';
import createState, { queue } from './state';
import render from './view';

jest.mock('./impulse');
jest.mock('./program');
jest.mock('./state');
jest.mock('./view');

const renderPrograms = () => {};
const data = {};
const state = {};
const info = {};
let context;

beforeEach(() => {
	jest.clearAllMocks();
	compile.mockReturnValue(renderPrograms);
	processMemo.mockReturnValue(data);
	createState.mockReturnValue(state);
	render.mockReturnValue(info);
	context = { '': expect.any(Function) };
});

describe('hotSwapStep', () => {
	it('swaps callback', async () => {
		const prevChildCallback = () => {};
		const nextChildCallback = () => {};
		const prevCallback = () => {};
		const nextCallback = () => {};
		const impulse = [() => {}, new Set()];
		const impulseInfo = [prevCallback, impulse];
		const childImpulse = [() => {}, new Set(), impulse];
		const childImpulseInfo = [prevChildCallback, childImpulse];
		impulseInfo.push(childImpulseInfo);
		const manifest = new Map();
		manifest.set(prevChildCallback, nextChildCallback);
		manifest.set(prevCallback, nextCallback);

		const info = ['div', {}, {},
			['span', {}],
			impulseInfo,
			{ nodeValue: 'text' },
		];

		const subscriptions = new Set();
		hotSwapStep(info, manifest, subscriptions);
		expect(subscriptions).toEqual(new Set([impulse, childImpulse]));
	});
});

// TODO: change these to integration tests with no mocks
describe('stew', () => {
	it('bounces back promise', async () => {
		const actual = stew();
		expect(effects).toEqual([]);
		expect(actual).toEqual(expect.any(Promise));
		await actual;
		expect(effects).toEqual([]);
	});

	it('creates render promise', async () => {
		queue.add([]);
		const actual = stew();
		expect(effects).toEqual([[, expect.any(Function)]]);
		expect(actual).toEqual(expect.any(Promise));
		setTimeout(() => effects.splice(0).map(effect => effect[1]()));
		await actual;
		expect(effects).toEqual([]);
	});

	it('creates webgl renderer', () => {
		const actual = stew`abc${456}xyz`;
		expect(compile).toHaveBeenCalledWith(['abc', 'xyz'], 456);
		expect(actual).toBe(renderPrograms);
	});

	it('creates state', () => {
		const props = { lmno: 456 };
		const actual = stew(props);
		expect(createState).toHaveBeenCalledWith(props);
		expect(actual).toBe(state);
	});

	it('creates impulse', () => {
		const callback = () => {};
		const actual = stew(callback);
		expect(render).toHaveBeenCalledWith([callback, {}], context, undefined, [], ['', {}], 0, {});
		expect(actual).toEqual(expect.any(Function));
	});

	it('creates impulse with params', () => {
		const callback = () => {};
		const props = { lmno: 456 };
		const actual = stew(callback, props, 'lmno');
		expect(render).toHaveBeenCalledWith([callback, props, 'lmno'], context, undefined, [], ['', {}], 0, {});
		expect(actual).toEqual(expect.any(Function));
	});

	it('creates state memo', () => {
		const props = { lmno: 456 };
		const actual = stew(props, []);
		expect(processMemo).toHaveBeenCalledWith(props, []);
		expect(actual).toBe(data);
	});

	it('creates custom memo', () => {
		const callback = () => {};
		const actual = stew(callback, []);
		expect(processMemo).toHaveBeenCalledWith(callback, []);
		expect(actual).toBe(data);
	});

	it('creates markdown memo', () => {
		const markdown = '# lmno';
		const actual = stew(markdown, []);
		expect(processMemo).toHaveBeenCalledWith(markdown, []);
		expect(actual).toBe(data);
	});

	it('creates fetch memo', () => {
		const callback = () => {};
		const fallback = { lmno: 456 };
		const actual = stew(callback, [], fallback);
		expect(processMemo).toHaveBeenCalledWith(callback, [], fallback);
		expect(actual).toBe(data);
	});

	it('creates effect', () => {
		const callback = () => {};
		const actual = stew(null, [], callback);
		expect(processMemo).toHaveBeenCalledWith(null, [], callback);
		expect(actual).toBe(data);
	});

	it('renders within node', () => {
		const node = {};
		const actual = stew(node, context, 'lmno');
		expect(render).toHaveBeenCalledWith([node, {}, 'lmno'], context, stew, [], ['', {}], 0, {});
		expect(actual).toEqual(expect.any(Function));
	});

	it('renders fragment', () => {
		const actual = stew('', context, 'lmno');
		expect(render).toHaveBeenCalledWith([expect.any(Object), {}, 'lmno'], context, stew, [], ['', {}], 0, {});
		expect(actual).toEqual(expect.any(Object));
	});

	it('renders within queried node', () => {
		const actual = stew('body', context, 'lmno');
		expect(render).toHaveBeenCalledWith([expect.any(Object), {}, 'lmno'], context, stew, [], ['', {}], 0, {});
		expect(actual).toEqual(expect.any(Object));
	});

	it('renders virtual fragment', () => {
		const actual = stew(stew, context, 'lmno');
		expect(render).toHaveBeenCalledWith([expect.any(Object), {}, 'lmno'], context, stew, [], ['', {}], 0, {});
		expect(actual).toEqual(expect.any(Object));
	});

	it('rejects missing node', () => {
		const actual = stew(null, context, 'lmno');
		expect(render).not.toHaveBeenCalled();
		expect(actual).toEqual(undefined);
	});
});
