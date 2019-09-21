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
			const actual = render({ '': ['br'] }, state, 1);
			expect(actual).toBe('<br>');
		});

		it('attributes', () => {
			const actual = render({
				'': ['img'], src: ['(', ['string'], ')'], alt: ['']
			}, state, 1);

			expect(actual).toBe('<img alt="" src="(abc)">');
		});

		it('content', () => {
			const actual = render({
				'': ['p', ['(', ['string'], ')']]
			}, state, 1);

			expect(actual).toBe('<p>(abc)</p>');
		});

		it('children', () => {
			const actual = render({
				'': ['div', ['('], { '': ['br'] }, { '': ['br'] }, [')']]
			}, state, 1);

			expect(actual).toBe('<div>(<br><br>)</div>');
		});

		it('conditional', () => {
			const actual = render({
				'': [[['object']], 'p', ['(', ['string'], ')']]
			}, state, 1);

			expect(actual).toBe('<p data--="1">(xyz)</p>');
		});

		it('hidden', () => {
			const actual = render({
				'': [[['missing']], 'p', ['(', ['string'], ')']]
			}, state, 1);

			expect(actual).toBe('');
		});

		it('iterate', () => {
			const actual = render({
				'': [[['array']], 'p', ['(', ['string'], ')']]
			}, state, 1);

			expect(actual).toBe([
				'<p data--="1-0">(abc)</p>',
				'<p data--="1-1">(xyz)</p>'
			].join(''));
		});
	});
});
