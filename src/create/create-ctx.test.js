import { createCtx } from './create-ctx';
import { trigger } from '../manage';

jest.mock('../manage');

describe('create-ctx', () => {
	const callback = jest.fn();
	let elm, ctx, memory, refs, state;

	beforeEach(() => {
		jest.clearAllMocks();
		elm = { '': [, 'container'] };
		ctx = { '': [, { '': 'scope' }] };
		memory = createCtx(callback, elm, ctx);
		refs = ((memory || {})[''] || [])[1];
		state = (refs || {})[''];
	});

	it('creates memory', () => {
		expect(memory).toEqual({
			'': [, { '': expect.any(Function) }, callback]
		});
	});

	it('returns default state', () => {
		const actual = state();
		expect(actual).toEqual({});
	});

	it('returns parent scope', () => {
		const actual = state('');
		expect(actual).toEqual('scope');
	});

	it('returns ref', () => {
		refs['name'] = [, 'element'];
		const actual = state('name');
		expect(actual).toEqual('element');
	});

	it('returns nested refs', () => {
		const fn = () => {};
		refs['name'] = [, { '': fn }, () => {}];
		const actual = state('name');

		expect(actual).toEqual(fn);
	});

	it('updates state', () => {
		state({ keep: 'abc', update: false });
		let actual = state();

		expect(actual).toEqual({ keep: 'abc', update: false });
		trigger.mockClear();

		state({ update: true, add: 123 });
		actual = state();

		expect(trigger).toHaveBeenCalledWith(memory, elm);
		expect(actual).toEqual({ keep: 'abc', update: true, add: 123 });
	});
});
