import { evaluate } from '../evaluate';

describe('evaluate', () => {
	describe('basics', () => {
		it('returns string content', () => {
			const actual = evaluate(['value'], {});
			expect(actual).toBe('value');
		});

		it('returns string attribute', () => {
			const actual = evaluate(['value'], {}, 'attribute');
			expect(actual).toBe(' attribute="value"');
		});

		it('skips empty attribute', () => {
			const actual = evaluate([['x']], {}, 'attribute');
			expect(actual).toBe('');
		});
	});

	describe('variables', () => {
		let template;

		beforeEach(() => {
			template = ['(', ['x'], ')'];
		});

		it('ignores missing property', () => {
			const actual = evaluate(template, {});
			expect(actual).toBe('()');
		});

		it('ignores undefined property', () => {
			const actual = evaluate(template, { x: undefined });
			expect(actual).toBe('()');
		});

		it('ignores null property', () => {
			const actual = evaluate(template, { x: null });
			expect(actual).toBe('()');
		});

		it('ignores function property', () => {
			const actual = evaluate(template, { x: () => {} });
			expect(actual).toBe('()');
		});

		it('includes true property', () => {
			const actual = evaluate(template, { x: true });
			expect(actual).toBe('(true)');
		});

		it('includes false property', () => {
			const actual = evaluate(template, { x: false });
			expect(actual).toBe('(false)');
		});

		it('includes number property', () => {
			const actual = evaluate(template, { x: 1 });
			expect(actual).toBe('(1)');
		});

		it('includes string property', () => {
			const actual = evaluate(template, { x: 'value' });
			expect(actual).toBe('(value)');
		});

		it('includes index property', () => {
			const actual = evaluate(['(', ['.'], ')'], { '.': 1 });
			expect(actual).toBe('(1)');
		});
	});

	describe('conditions', () => {
		it('returns positive comparison', () => {
			const actual = evaluate([['x', 1]], { x: 1 }, 'attribute');
			expect(actual).toBe(' attribute');
		});

		it('returns negative comparison', () => {
			const actual = evaluate([['x', 2]], { x: 1 }, 'attribute');
			expect(actual).toBe('');
		});

		it('returns conditional string', () => {
			const actual = evaluate([['x', 1], 'value'], { x: 1 });
			expect(actual).toBe('value');
		});

		it('ignores conditional string', () => {
			const actual = evaluate([['x', 2], 'value'], { x: 1 });
			expect(actual).toBe('');
		});
	});

	describe('hydration', () => {
		const getAttribute = jest.fn();
		const addEventListener = jest.fn();
		const update = jest.fn();
		let state;
		let element;
		let action;
		let template;
	
		beforeEach(() => {
			getAttribute.mockClear();

			addEventListener.mockClear().mockImplementation((name, value) => {
				action = value;
			});

			template = ['(', ['x'], ')'];
			state = {};
	
			element = {
				getAttribute,
				addEventListener
			};
		});
		
		it('skips action', () => {
			const actual = evaluate([['x']], state, 'onclick');
			expect(actual).toBe('');
		});

		it('creates action', () => {
			evaluate([['x']], state, 'onclick', element, update);

			expect(addEventListener).toHaveBeenCalledWith('click', action);
			expect(state).toEqual({});

			action();

			expect(state.x).toBe(true);
			expect(update).toHaveBeenCalled();
		});

		it('extracts string from attribute', () => {
			getAttribute.mockReturnValue('(value)');
	
			evaluate(template, state, 'attribute', element, update);
	
			expect(state).toEqual({ x: 'value' });
		});

		it('extracts string', () => {
			element.nodeValue = '(value)';
	
			evaluate(template, state, '', element, update);
	
			expect(state).toEqual({ x: 'value' });
		});

		it('extracts number', () => {
			element.nodeValue = '(1)';
	
			evaluate(template, state, '', element, update);
	
			expect(state).toEqual({ x: 1 });
		});

		it('extracts true', () => {
			element.nodeValue = '(true)';
	
			evaluate(template, state, '', element, update);
	
			expect(state).toEqual({ x: true });
		});

		it('extracts false', () => {
			element.nodeValue = '(false)';
	
			evaluate(template, state, '', element, update);
	
			expect(state).toEqual({ x: false });
		});

		it('ignores index', () => {
			element.nodeValue = '(1)';
	
			evaluate(['(', ['.'], ')'], state, '', element, update);
	
			expect(state).toEqual({});
		});

		it('ignores empty', () => {
			element.nodeValue = '()';
	
			evaluate(template, state, '', element, update);
	
			expect(state).toEqual({});
		});

		it('extracts condition', () => {
			element.nodeValue = 'value';
	
			evaluate([['x', 1], 'value'], state, '', element, update);
	
			expect(state).toEqual({ x: 1 });
		});

		it('extracts index', () => {
			state['.'] = 1;
			element.nodeValue = 'value';
	
			evaluate([['x', '.'], 'value'], state, '', element, update);
	
			expect(state).toEqual({
				'.': 1,
				x: 1
			});
		});

		it('ignores condition', () => {
			element.nodeValue = 'value';
	
			evaluate([['x', 1], 'other value'], state, '', element, update);
	
			expect(state).toEqual({});
		});

		it('ignores index keyed condition', () => {
			element.nodeValue = 'value';
	
			evaluate([['.', 1], 'value'], state, '', element, update);
	
			expect(state).toEqual(state);
		});
	});
});
