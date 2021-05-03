import { reconcile } from '../manage';
import { create } from './create';
import { modify } from './modify';
import { transform } from './transform';
import { update } from './update';

jest.mock('../manage');
jest.mock('./create');
jest.mock('./modify');
jest.mock('./transform');

describe('update', () => {
	const callback = () => {};
	let memory, ctx, elm, txt, arr, container, child, root, direct;

	beforeEach(() => {
		memory = undefined;
		ctx = { '': [['child'], {}, callback], key: 'prop' };
		elm = { '': [['child'], {}, 'div'], key: 'prop' };
		txt = { '': ['text', {}]};
		arr = { '': [['child'],, '']};
		container = document.createElement('div');
		child = document.createElement('span');
		container.appendChild(child);

		jest.clearAllMocks();
		transform.mockReturnValue(['fragment']);
		create.mockImplementation(() => memory = { '': [[], {}]});
	});

	describe('create detached root', () => {
		it('creates ctx', () => {
			const actual = update(ctx);

			expect(create).toHaveBeenCalledWith(callback, undefined, undefined, undefined);
			expect(transform).toHaveBeenCalledWith(memory, { key: 'prop' }, ['child']);

			expect(reconcile.mock.calls).toEqual([
				[memory, ['fragment'], undefined, memory, undefined]
			]);

			expect(actual).toEqual(memory);
		});

		it('creates elm', () => {
			const actual = update(elm);

			expect(create).toHaveBeenCalledWith('div', undefined, undefined, undefined);
			expect(modify).toHaveBeenCalledWith(memory, { key: 'prop' }, ['child']);

			expect(reconcile.mock.calls).toEqual([
				[memory, ['child'], memory, undefined, undefined]
			]);

			expect(actual).toEqual(memory);
		});

		it('creates txt', () => {
			const actual = update(txt);

			expect(create).toHaveBeenCalledWith(undefined, undefined, 'text', undefined);
			expect(modify).toHaveBeenCalledWith(memory, {}, 'text');
			expect(reconcile).not.toHaveBeenCalled();
			expect(actual).toEqual(memory);
		});

		it('creates arr', () => {
			const actual = update(arr);

			expect(create).toHaveBeenCalledWith('', undefined, ['child'], undefined);
			expect(transform).not.toHaveBeenCalled();
			expect(modify).not.toHaveBeenCalled();

			expect(reconcile.mock.calls).toEqual([
				[memory, ['child'], undefined, undefined, undefined]
			]);

			expect(actual).toEqual(memory);
		});
	});

	describe('create attached root', () => {
		it('creates ctx', () => {
			const actual = update(ctx, container);
			expect(actual).toEqual(memory);
		});

		it('creates elm', () => {
			const actual = update(elm, container);
			expect(actual).toEqual(memory);
		});

		it('creates txt', () => {
			const actual = update(txt, container);
			expect(actual).toEqual(memory);
		});

		it('creates arr', () => {
			const actual = update(arr, container);
			expect(actual).toEqual(memory);
		});
	});

	describe('update child', () => {
		it('update using index', () => {
			const outline = { '': [['new text']] };
			const container = { '': [[txt]] };
			const actual = update(outline, container, 0);

			expect(create).not.toHaveBeenCalled();

			expect(reconcile.mock.calls).toEqual([
				[txt, ['new text'], txt, undefined, undefined]
			]);

			expect(actual).toBe(txt);
		});

		it('update using key', () => {
			const outline = { '': [['new child'], 'id', 'div'], key: 'new prop' };
			const container = { '': [[]] };
			const refs = { id: elm };
			const ctx = { '': [[], {}] };
			const actual = update(outline, container, 0, refs, container, ctx);

			expect(create).not.toHaveBeenCalled();

			expect(reconcile.mock.calls).toEqual([
				[elm, ['new child'], elm, ctx, undefined]
			]);

			expect(actual).toBe(elm);
		});

		it('differentiates array from fragment', () => {
			const outline = arr;
			const container = { '': [[{ '': [[], undefined, '', ['child']] }]] };
			const actual = update(outline, container, 0);

			expect(create).toHaveBeenCalledWith('', undefined, ['child'], undefined);

			expect(reconcile.mock.calls).toEqual([
				[memory, ['child'], undefined, undefined, undefined]
			]);

			expect(actual).toBe(memory);
		});
	});
});
