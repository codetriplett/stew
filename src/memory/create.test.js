import { trigger } from '../manage';
import { create } from './create';

jest.mock('../manage');

describe('create', () => {
	describe('ctx', () => {
		const callback = jest.fn();
		let elm, ctx, memory, refs, state;
	
		beforeEach(() => {
			jest.clearAllMocks();
			elm = { '': [, 'container'] };
			ctx = { '': [, { '': { '': 'scope' } }] };
			memory = create(callback, elm, ctx);
			refs = ((memory || {})[''] || [])[1];
			state = (refs || {})[''];
		});

		it('creates memory', () => {
			expect(memory).toEqual({
				'': [,
					{ '': { '': expect.any(Function) } },
					callback,
					undefined
				]
			});
		});

		it('returns parent scope', () => {
			const actual = state['']('');
			expect(actual).toEqual('scope');
		});

		it('returns ref', () => {
			refs['name'] = [, 'element'];
			const actual = state['']('name');
			expect(actual).toEqual('element');
		});

		it('returns nested refs', () => {
			const fn = () => {};
			refs['name'] = [, { '': { '': fn } }, () => {}];
			const actual = state['']('name');

			expect(actual).toEqual(fn);
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
			const actual = create('div', { '': [] });
			const div = document.createElement('div');
			expect(actual).toEqual({ '': [[], div, 'div', undefined] });
		});
	
		it('hydrates existing node', () => {
			const div = document.createElement('div');
			const img = document.createElement('img');
			div.appendChild(img);
			const nodes = [div];
			const actual = create('div', { '': [,,, nodes] });
	
			expect(nodes).toHaveLength(0);
			expect(actual).toEqual({ '': [[], div, 'div', [img]] });
			expect(actual[''][1]).toBe(div);
		});
	});

	describe('txt', () => {
		it('creates new text', () => {
			const actual = create(undefined, { '': [] }, 'abc');
			const text = document.createTextNode('abc');
			expect(actual).toEqual({ '': ['abc', text,,,] });
		});
	
		it('hydrates existing text', () => {
			const text = document.createTextNode('abc');
			const nodes = [text];
			const actual = create(undefined, { '': [,,, nodes] }, 'abc');
	
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
	});
});
