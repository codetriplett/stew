import $ from '../mock';
import { traverse } from '../traverse'

describe('traverse', () => {
	describe('generate', () => {
		it('should render self closing tag', () => {
			const actual = traverse($('<img>'));
			expect(actual).toBe('<img>');
		});

		it('should attributes', () => {
			const actual = traverse($('<img src="image.jpg" alt="">'));
			expect(actual).toBe('<img alt="" src="image.jpg">');
		});

		it('should render content', () => {
			const actual = traverse($('<div>before<img>after</>'));
			expect(actual).toBe('<div>before<img>after</div>');
		});
	});
});
