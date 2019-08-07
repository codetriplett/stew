import { evaluate } from '../evaluate';

describe('evaluate', () => {
	describe('generate', () => {
		let template;
		let state;

		beforeEach(() => {
			template = [['value']];
			state = { value: 'string' };
		});

		it('forms content', () => {
			const actual = evaluate(template, state);
			expect(actual).toBe('string');
		});

		it('forms attribute', () => {
			const actual = evaluate(template, state, 'attribute');
			expect(actual).toBe(' attribute="string"');
		});

		it('forms flag', () => {
			template[0].push('string');
			const actual = evaluate(template, state, 'attribute');
			expect(actual).toBe(' attribute');
		});

		it('clears attribute', () => {
			template = ['string', ['value', 'other']];
			const actual = evaluate(template, state, 'attribute');
			expect(actual).toBe('');
		});
		
		it('ignores action', () => {
			const actual = evaluate(template, state, 'onclick');
			expect(actual).toBe('');
		});
	});

	describe('hydrate', () => {
		const addEventListener = jest.fn();
		const update = jest.fn();
		let template;
		let state;
		let element;

		beforeEach(() => {
			addEventListener.mockClear();
			update.mockClear();
			template = [['value']];
			state = {};

			element = {
				nodeValue: 'content',
				getAttribute: name => name === 'flag' ? '' : name,
				addEventListener
			};
		});

		it('extracts content', () => {
			evaluate(template, state, '', element, update);
			expect(state).toEqual({ value: 'content' });
		});

		it('extracts attribute', () => {
			evaluate(template, state, 'attribute', element, update);
			expect(state).toEqual({ value: 'attribute' });
		});

		it('ignores missing attribute', () => {
			element.getAttribute = () => '';
			evaluate(template, state, 'attribute', element, update);
			expect(state).toEqual({});
		});

		it('extracts flag', () => {
			template[0].push('flag');
			element.getAttribute = () => '';
			evaluate(template, state, 'flag', element, update);

			expect(state).toEqual({ value: 'flag' });
		});

		it('ignores missing flag', () => {
			template = ['string', ['value', 'flag']];
			element.getAttribute = () => null;
			evaluate(template, state, 'flag', element);

			expect(state).toEqual({});
		});
		
		it('sets action', () => {
			evaluate(template, state, 'onclick', element, update);

			expect(addEventListener).toHaveBeenCalledWith(
				'click', expect.any(Function)
			);
			
			expect(state).toEqual({});
		});
	});

	describe('update', () => {
		const setNodeValue = jest.fn();
		const addEventListener = jest.fn();
		const toggleAttribute = jest.fn();
		const removeAttribute = jest.fn();
		const setAttribute = jest.fn();
		let template;
		let state;
		let element;

		beforeEach(() => {
			setNodeValue.mockClear();
			addEventListener.mockClear();
			toggleAttribute.mockClear();
			removeAttribute.mockClear();
			setAttribute.mockClear();
			template = [['value']];
			state = { value: 'string' };

			element = {
				getAttribute: name => name === 'flag' ? '' : name,
				addEventListener,
				toggleAttribute,
				removeAttribute,
				setAttribute
			};

			Object.defineProperty(element, 'nodeValue', {
				get: () => 'content',
				set: value => setNodeValue(value)
			});
		});

		it('updates content', () => {
			evaluate(template, state, '', element);
			expect(setNodeValue).toHaveBeenCalledWith('string');
		});

		it('ignores content', () => {
			state.value = 'content';
			evaluate(template, state, '', element);
			expect(setNodeValue).not.toHaveBeenCalled();
		});

		it('updates attribute', () => {
			evaluate(template, state, 'attribute', element);
			expect(setAttribute).toHaveBeenCalledWith('attribute', 'string');
		});

		it('ignores attribute', () => {
			element.getAttribute = () => 'attribute';
			evaluate(template, state, 'attribute', element);
			expect(setAttribute).toHaveBeenCalledWith('attribute', 'string');
		});

		it('sets flag', () => {
			element.getAttribute = () => null;
			template[0].push('string');
			evaluate(template, state, 'flag', element);

			expect(toggleAttribute).toHaveBeenCalledWith('flag', true);
		});

		it('does not set flag', () => {
			template[0].push('string');
			evaluate(template, state, 'flag', element);
			expect(toggleAttribute).not.toHaveBeenCalled();
		});

		it('clears flag', () => {
			template[0].push('other');
			evaluate(template, state, 'flag', element);
			expect(removeAttribute).toHaveBeenCalledWith('flag');
		});

		it('does not clear flag', () => {
			element.getAttribute = () => null;
			template[0].push('other');
			evaluate(template, state, 'flag', element);
			expect(removeAttribute).not.toHaveBeenCalled();
		});
		
		it('ignores action', () => {
			evaluate(template, state, 'onclick', element);
			expect(addEventListener).not.toHaveBeenCalled();
		});
	});
});
