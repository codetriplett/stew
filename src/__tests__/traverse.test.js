import { parse } from '../parse';
import { traverse } from '../traverse'

describe('traverse', () => {
	describe('generate', () => {
		let state;

		beforeEach(() => {
			state = { value: 'string' };
			state[''] = state;
		});

		it('renders attributes', () => {
			const template = parse('<img class="value" attribute={value}>');
			const actual = traverse(template, state);

			expect(actual).toBe('<img attribute="string" class="value ">');;
		});
		
		it('renders content', () => {
			const template = parse('<div>({value})</>');
			const actual = traverse(template, state);

			expect(actual).toBe('<div>(string)</div>');;
		});
		
		it('renders children', () => {
			const template = parse('<div>(<span>{value}</span>)</>');
			const actual = traverse(template, state);

			expect(actual).toBe('<div>(<span>string</span>)</div>');
		});
		
		it('renders conditional element', () => {
			const template = parse('<div {value}>{}</>');
			const actual = traverse(template, state, 0);

			expect(actual).toBe('<div data--"0">string</div>');
		});
		
		it('ignores conditional element', () => {
			const template = parse('<div {other}>{}</>');
			const actual = traverse(template, state, 0);

			expect(actual).toBe('');
		});
		
		it('renders iteration', () => {
			state = { value: ['one', 'two'], '': state.value, '.': 0 };

			const template = parse('<div {value}>{}</>');
			const actual = traverse(template, state, '0-0');

			expect(actual).toBe('<div data--"0-0">string</div>');
		});
		
		it('renders all iterations', () => {
			state.value = ['one', 'two'];

			const template = parse('<div {value}>{}</>');
			const actual = traverse(template, state, 0);

			expect(actual).toBe(
				'<div data--"0-0">one</div><div data--"0-1">two</div>'
			);
		});

		it('renders something more complicated', () => {
			state = {
				headline: 'Headline',
				stories: [
					{
						highlight: true,
						title: 'First',
						media: {
							image: 'first.jpg',
							alt: 'f',
							caption: 'first'
						},
						description: 'First.'
					},
					{
						title: 'Second',
						description: 'Second.'
					}
				]
			};
			state[''] = state;

			const template = parse(`
				<div class="container">
					<h1>{headline}</h1>
					<div {stories} class="story "{highlight true}"highlighted">
						<h2>{title}</h2>
						<div {media}>
							<img src="http://domain.com/"{image} alt=""{alt}>
							<p>name: {caption}</p>
						</div>
						<p>{description}</p>
					</>
				</>
			`);

			const actual = traverse(template, state);

			expect(actual).toBe([
				'<div class="container ">',
					'<h1>Headline</h1>',
					'<div data--"1-0" class="story highlighted">',
						'<h2>First</h2>',
						'<div data--"1">',
							'<img alt="f" src="http://domain.com/first.jpg">',
							'<p>name: first</p>',
						'</div>',
						'<p>First.</p>',
					'</div>',
					'<div data--"1-1" class="story ">',
						'<h2>Second</h2>',
						'<p>Second.</p>',
					'</div>',
				'</div>'
			].join(''));
		});
	});
});
