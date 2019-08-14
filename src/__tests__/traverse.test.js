import $ from '../mock';
import { traverse } from '../traverse'

describe('traverse', () => {
	describe('generate', () => {
		describe('static', () => {
			it('content', () => {
				const actual = traverse('content');
				expect(actual).toBe('content');
			});

			it('leaf', () => {
				const template = $('<img>');
				const actual = traverse(template);

				expect(actual).toBe('<img>');
			});

			it('attributes', () => {
				const template = $('<img src="image.jpg" alt="">');
				const actual = traverse(template);

				expect(actual).toBe('<img alt="" src="image.jpg">');
			});

			it('class', () => {
				const template = $('<img class="before after">');
				const actual = traverse(template);

				expect(actual).toBe('<img class="before after">');
			});

			it('container', () => {
				const template = $('<div>before<img>after</>');
				const actual = traverse(template);
				
				expect(actual).toBe('<div>before<img>after</div>');
			});
		});
	});
});
