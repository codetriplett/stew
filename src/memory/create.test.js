import { locate, trigger } from '../manage';
import { create } from './create';

jest.mock('../manage');

describe('create', () => {
	describe('ctx', () => {
		const tag = jest.fn();
		const callback = jest.fn();
		let elm, ctx, memory, refs, state;
	
		beforeEach(() => {
			jest.clearAllMocks();
			locate.mockReturnValue('first node');
			callback.mockReturnValue(1);
			elm = { '': [[], 'container'] };
			ctx = { '': [[], { '': { '': callback } }] };
			memory = create(tag, elm, ctx, {});
			[, refs] = (memory || {})[''] || [];
			state = (refs || {})[''];
		});

		it('creates memory', () => {
			expect(memory).toEqual({
				'': [
					undefined,
					{ '': { '': expect.any(Function) } },
					tag,
					undefined
				]
			});
		});

		it('returns depth', () => {
			const actual = state['']();
			expect(actual).toEqual(2);
		});

		it('returns ref', () => {
			refs['name'] = { '': [, 'element'] };
			const actual = state['']('name');
			expect(actual).toEqual('element');
		});

		it('returns nested refs', () => {
			const fn = jest.fn().mockReturnValue('element');
			refs['name'] = { '': [, { '': { '': fn } }, () => {}] };
			const actual = state['']('name', 'subname');

			expect(fn).toHaveBeenCalledWith('subname');
			expect(actual).toEqual('element');
		});

		it('returns first child node', () => {
			memory[''][0] = ['first', 'second'];
			const actual = state['']('');
			expect(locate).toHaveBeenCalledWith(['first', 'second']);
			expect(actual).toEqual('first node');
		});

		it('updates state', () => {
			state['']({ keep: 'abc', update: false });

			expect(state).toEqual({
				'': expect.any(Function),
				keep: 'abc',
				update: false
			});

			trigger.mockClear();
			state['']({ update: true, add: 123 });
			expect(trigger).toHaveBeenCalledWith(memory, elm);

			expect(state).toEqual({
				'': expect.any(Function),
				keep: 'abc',
				update: true,
				add: 123
			});
		});
	});

	describe('elm', () => {
		it('creates new node', () => {
			const actual = create('div', { '': [] }, {});
			const div = document.createElement('div');
			expect(actual).toEqual({ '': [[], div, 'div', undefined] });
		});
	
		it('hydrates existing node', () => {
			const div = document.createElement('div');
			const img = document.createElement('img');
			div.appendChild(img);
			const nodes = [div];
			const actual = create('div', { '': [,,, nodes] }, {}, { class: 'wrapper' });
	
			expect(nodes).toHaveLength(0);
			expect(actual).toEqual({ '': [[], div, 'div', [img]], class: 'wrapper' });
			expect(actual[''][1]).toBe(div);
		});
	
		it('does not preload listeners when hydrating', () => {
			const a = document.createElement('a');
			const nodes = [a];
			const actual = create('a', { '': [,,, nodes] }, {}, { onclick: () => {} });
	
			expect(nodes).toHaveLength(0);
			expect(actual).toEqual({ '': [[], a, 'a', []] });
			expect(actual[''][1]).toBe(a);
		});
	});

	describe('txt', () => {
		it('creates new text', () => {
			const actual = create(undefined, { '': [] }, 'abc', {});
			const text = document.createTextNode('abc');
			expect(actual).toEqual({ '': ['abc', text,,,] });
		});
	
		it('hydrates existing text', () => {
			const text = document.createTextNode('abc');
			const nodes = [text];
			const actual = create(undefined, { '': [,,, nodes] }, 'abc', {});
	
			expect(nodes).toHaveLength(0);
			expect(actual).toEqual({ '': ['abc', text,,,] });
			expect(actual[''][1]).toBe(text);
		});
	});

	describe('arr', () => {
		it('sets content', () => {
			const actual = create('', { '': [] }, ['abc']);
			expect(actual).toEqual({ '': [[],, '',,] });
		});

		it('sets custom fragment content', () => {
			const actual = create('', { '': [] }, ['abc'], ['html']);
			expect(actual).toEqual({ '': [[],, '', []] });
		});
	});
});
