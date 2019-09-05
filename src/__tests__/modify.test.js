import { modify } from '../modify';

describe('modify', () => {
	describe('content', () => {
		describe('generate', () => {
			it('does not return content when false', () => {
				const actual = modify([false]);
				expect(actual).toBe('');
			});

			it('does not return content when true', () => {
				const actual = modify([true]);
				expect(actual).toBe('');
			});

			it('joins strings to form content', () => {
				const actual = modify(['(', 'value', ')']);
				expect(actual).toBe('(value)');
			});
		});
	});

	describe('attribute', () => {
		describe('generate', () => {
			it('does not return attribute when false', () => {
				const actual = modify([false], 'name');
				expect(actual).toBe('');
			});

			it('returns boolean attribute when true', () => {
				const actual = modify([true], 'name');
				expect(actual).toBe(' name');
			});

			it('joins strings to form attribute', () => {
				const actual = modify(['(', 'value', ')'], 'name');
				expect(actual).toBe(' name="(value)"');
			});
		});

		describe('hydrate', () => {		
			it('sets action', () => {
				const action = () => {};
				const addEventListener = jest.fn();
				const element = { addEventListener };
				modify(action, 'onclick', element);

				expect(addEventListener).toHaveBeenCalledWith('click', action);
			});
		});
	});
});
