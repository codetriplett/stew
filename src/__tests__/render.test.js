import { parse } from '../parse';
import { render } from '../render';

describe('render', () => {
	describe('generate', () => {
		let state;

		beforeEach(() => {
			state = {
				'.': { backup: {} },
				string: 'abc',
				object: { string: 'xyz' },
				array: [
					{ string: 'abc' },
					{ string: 'xyz' }
				]
			};
		});

		it('tag', () => {
			const template = parse('<br>');
			const actual = render(template, state, 1);

			expect(actual).toBe('<br>');
		});

		it('attributes', () => {
			const template = parse('<img src="("{string}")" alt="">');
			const actual = render(template, state, 1);

			expect(actual).toBe('<img alt="" src="(abc)">');
		});

		it('empty', () => {
			const template = parse('<div></>');
			const actual = render(template, state, 1);

			expect(actual).toBe('<div></div>');
		});

		it('content', () => {
			const template = parse('<p>({string})</>');
			const actual = render(template, state, 1);

			expect(actual).toBe('<p>(abc)</p>');
		});

		it('children', () => {
			const template = parse('<div>(<br><br>)</>');
			const actual = render(template, state, 1);

			expect(actual).toBe('<div>(<br><br>)</div>');
		});

		it('conditional', () => {
			const template = parse('<p {object}>({string})</p>');
			const actual = render(template, state, 1);

			expect(actual).toBe('<p data--="1">(xyz)</p>');
		});

		it('hidden', () => {
			const template = parse('<p {missing}>({string})</p>');
			const actual = render(template, state, 1);

			expect(actual).toBe('');
		});

		it('iterate', () => {
			const template = parse('<p {array}>({string})</p>');
			const actual = render(template, state, 1);

			expect(actual).toBe([
				'<p data--="1-0">(abc)</p>',
				'<p data--="1-1">(xyz)</p>'
			].join(''));
		});

		it.only('complex', () => {
			const template = parse(`
				<div {array}>
					<img src="("{string}")" alt="">
					<br>
					<p>{.string}</p>
				</>
			`);

			const actual = render(template, state, 1);

			expect(actual).toBe([
				'<div>',
					'<img alt="" src="(abc)">',
				'</div>'
			].join(''));
		});
	});
});
