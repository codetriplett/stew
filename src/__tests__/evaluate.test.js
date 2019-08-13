import $, { mock } from '../mock';
import { evaluate } from '../evaluate';

describe('evaluate', () => {
	describe('generate', () => {
		it('should render content', () => {
			const actual = evaluate('value', {});
			expect(actual).toBe('value');
		});

		it('should render attribute', () => {
			const actual = evaluate('value', {}, 'attribute');
			expect(actual).toBe(' attribute="value"');
		});
	});
});
