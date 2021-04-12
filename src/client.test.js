import { client as $ } from './client';
import { createCtx, createElm, createTxt } from './create';
import { reconcile } from './manage';
import { updateCtx, updateElm, updateTxt } from './update';

jest.mock('./create');
jest.mock('./manage');
jest.mock('./update');

describe('client', () => {
	const callback = jest.fn();
	let ctx, elm, txt, container, child, root, direct;

	beforeEach(() => {
		jest.clearAllMocks();
		createCtx.mockReturnValue(ctx = { '': [[], 'ctx'] });
		createElm.mockReturnValue(elm = { '': [[], 'elm'] });
		createTxt.mockReturnValue(txt = { '': [[], 'txt'] });
		updateCtx.mockReturnValue('fragment');
		container = document.createElement('div');
		child = document.createElement('span');
		container.appendChild(child);
		root = { '': [[],,, [undefined]] };
		direct = { '': [[]] };
	});

	describe('create detached root', () => {
		it('creates ctx', () => {
			const actual = $(callback, { key: 'prop' }, 'child')();

			expect(createCtx).toHaveBeenCalledWith(callback, root, undefined);
			expect(updateCtx).toHaveBeenCalledWith(ctx, { key: 'prop' }, ['child']);

			expect(reconcile.mock.calls).toEqual([
				[ctx, root, 'fragment', ctx, undefined, undefined]
			]);

			expect(ctx).toEqual({ '': expect.anything(), key: 'prop' });
			expect(actual).toEqual('ctx');
		});

		it('creates elm', () => {
			const actual = $('div', { key: 'prop' }, 'child')();

			expect(createElm).toHaveBeenCalledWith('div', root);
			expect(updateElm).toHaveBeenCalledWith(elm, { key: 'prop' });

			expect(reconcile.mock.calls).toEqual([
				[elm, elm, ['child'], undefined, undefined, undefined]
			]);

			expect(elm).toEqual({ '': expect.anything(), key: 'prop' });
			expect(actual).toEqual('elm');
		});

		it('creates txt', () => {
			const actual = $('text')();

			expect(createTxt).toHaveBeenCalledWith('text', root);
			expect(updateTxt).toHaveBeenCalledWith(txt, 'text');
			expect(reconcile).not.toHaveBeenCalled();
			expect(txt).toEqual({ '': expect.anything() });
			expect(actual).toEqual('txt');
		});

		it('creates fragment', () => {
			const actual = $('', {}, 'child')();

			expect(createCtx).not.toHaveBeenCalled();
			expect(createElm).not.toHaveBeenCalled();
			expect(createTxt).not.toHaveBeenCalled();
			expect(updateCtx).not.toHaveBeenCalled();
			expect(updateElm).not.toHaveBeenCalled();
			expect(updateTxt).not.toHaveBeenCalled();

			expect(reconcile.mock.calls).toEqual([
				[{ '': [[]] }, root, ['child'], undefined, undefined, undefined]
			]);

			expect(actual).toEqual(undefined);
		});
	});

	describe('create attached root', () => {
		it('creates ctx', () => {
			root = { '': [[], 'elm'] };
			const actual = $(callback, { key: 'prop' }, 'child')(container);

			expect(createCtx).toHaveBeenCalledWith(callback, root, undefined);
			expect(updateCtx).toHaveBeenCalledWith(ctx, { key: 'prop' }, ['child']);

			expect(reconcile.mock.calls).toEqual([
				[ctx, root, 'fragment', ctx, undefined, true]
			]);

			expect(ctx).toEqual({ '': expect.anything(), key: 'prop' });
			expect(actual).toEqual('ctx');
		});

		it('creates elm', () => {
			root[''][3] = [container];
			elm[''][3] = [child];
			const actual = $('div', { key: 'prop' }, 'child')(container);

			expect(createElm).toHaveBeenCalledWith('div', root);
			expect(updateElm).toHaveBeenCalledWith(elm, { key: 'prop' });

			expect(reconcile.mock.calls).toEqual([
				[elm, elm, ['child'], undefined, undefined, true]
			]);

			expect(elm).toEqual({ '': expect.anything(), key: 'prop' });
			expect(actual).toEqual('elm');
		});

		it('creates txt', () => {
			container = document.createTextNode('text');
			root[''][3] = [container];
			const actual = $('text')(container);

			expect(createTxt).toHaveBeenCalledWith('text', root);
			expect(updateTxt).toHaveBeenCalledWith(txt, 'text');
			expect(reconcile).not.toHaveBeenCalled();
			expect(txt).toEqual({ '': expect.anything() });
			expect(actual).toEqual('txt');
		});

		it('creates fragment', () => {
			root[''][3] = [container];
			const actual = $('', {}, 'child')(container);

			expect(createCtx).not.toHaveBeenCalled();
			expect(createElm).not.toHaveBeenCalled();
			expect(createTxt).not.toHaveBeenCalled();
			expect(updateCtx).not.toHaveBeenCalled();
			expect(updateElm).not.toHaveBeenCalled();
			expect(updateTxt).not.toHaveBeenCalled();

			expect(reconcile.mock.calls).toEqual([
				[{ '': [[]] }, root, ['child'], undefined, undefined, true]
			]);

			expect(actual).toEqual(undefined);
		});
	});

	describe('update child', () => {
		let memory;

		beforeEach(() => {
			memory = { '': [[],, 'div'] }
			direct[''][0] = [memory];
		});

		it('update using index', () => {
			const actual = $('div', { '': 'child', key: 'prop' }, 'child')(direct, root, 0);

			expect(createElm).not.toHaveBeenCalled();

			expect(reconcile.mock.calls).toEqual([
				[memory, memory, ['child'], undefined, undefined, undefined]
			]);

			expect(memory).toEqual({ '': expect.anything(), key: 'prop' });
			expect(actual).toBe(memory);
		});

		it('update using key', () => {
			const ctx = { '': [[], { child: memory }] };
			const actual = $('div', { '': 'child', key: 'prop' }, 'child')(direct, root, 0, ctx);

			expect(createElm).not.toHaveBeenCalled();

			expect(reconcile.mock.calls).toEqual([
				[memory, memory, ['child'], ctx, undefined, undefined]
			]);

			expect(memory).toEqual({ '': expect.anything(), key: 'prop' });
			expect(actual).toBe(memory);
		});

		it('creates ctx with scope', () => {
			const scope = { '': [[], {}] };
			$(callback, { key: 'prop' }, 'child')(direct, root, 0, scope);
			expect(createCtx).toHaveBeenCalledWith(callback, root, scope);
		});
	});
});
