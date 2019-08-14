import $, { mock } from '../mock';
import { evaluate } from '../evaluate';

describe('evaluate', () => {
	describe('generate', () => {
		describe('static', () => {
			it('content', () => {
				const actual = evaluate('value', {});
				expect(actual).toBe('value');
			});

			it('attribute', () => {
				const actual = evaluate('value', {}, 'attribute');
				expect(actual).toBe(' attribute="value"');
			});

			it('class', () => {
				const actual = evaluate(' before  after ', {}, 'class');
				expect(actual).toBe(' class="before after"');
			});

			it('flag', () => {
				const actual = evaluate(true, {}, 'attribute');
				expect(actual).toBe(' attribute');
			});
		});
	});
});
