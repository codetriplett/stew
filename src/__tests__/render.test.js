import { parse } from '../parse';
import { render } from '../render';

function normalize (elements) {
	return elements.map(({ tagName, attributes, childNodes, nodeValue }) => {
		if (nodeValue !== null) {
			return nodeValue;
		}
	
		tagName = tagName.toLowerCase();
		attributes = Array.from(attributes);
		childNodes = normalize(Array.from(childNodes));
	
		const object = { '': [tagName, ...childNodes] };
	
		for (const { name, value } of attributes) {
			object[name] = value;
		}
	
		return object
	});
}

describe('render', () => {
	describe('generate', () => {
		let backup = {};
		let state;

		beforeEach(() => {
			backup = {};

			state = {
				'.': [backup],
				number: 123,
				string: 'abc',
				object: { string: 'xyz' },
				array: [
					{ string: 'abc' },
					{ string: 'xyz' }
				]
			};

			state[''] = state;
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

		it('complex', () => {
			const template = parse(`
				<div {array}>
					<img src="("{string.}")" alt="">
					<br>
					<p>({.number})</p>
				</>
			`);

			const actual = render(template, state, 1);

			expect(backup).toEqual({
				array: [
					{ string: 'abc' },
					{ string: 'xyz' }
				]
			});

			expect(actual).toBe([
				'<div data--="1-0">',
					'<img alt="" src="(abc)">',
					'<br>',
					'<p>(123)</p>',
				'</div>',
				'<div data--="1-1">',
					'<img alt="" src="(xyz)">',
					'<br>',
					'<p>(123)</p>',
				'</div>'
			].join(''));
		});
	});

	describe('create', () => {
		const update = jest.fn();
		let state;

		beforeEach(() => {
			update[''] = true;
			
			state = {
				'.': [update],
				number: 123,
				string: 'abc',
				object: { string: 'xyz' },
				array: [
					{ string: 'abc' },
					{ string: 'xyz' }
				]
			};

			state[''] = state;
		});

		it('tag', () => {
			const template = parse('<br>');
			const actual = render(template, state, 1);
			const [element] = normalize(actual);

			expect(actual).toHaveLength(1);
			expect(element).toEqual({ '': ['br'] });
		});

		it('attributes', () => {
			const template = parse('<img src="("{string}")" alt="">');
			const actual = render(template, state, 1);
			const [element] = normalize(actual);

			expect(actual).toHaveLength(1);
			expect(element).toEqual({ '': ['img'], alt: '', src: '(abc)'});
		});

		it('empty', () => {
			const template = parse('<div></>');
			const actual = render(template, state, 1);
			const [element] = normalize(actual);

			expect(actual).toHaveLength(1);
			expect(element).toEqual({ '': ['div', ''] });
		});

		it('content', () => {
			const template = parse('<p>({string})</>');
			const actual = render(template, state, 1);
			const [element] = normalize(actual);

			expect(actual).toHaveLength(1);
			expect(element).toEqual({ '': ['p', '(abc)'] });
		});

		it('children', () => {
			const template = parse('<div>(<br><br>)</>');
			const actual = render(template, state, 1);
			const [element] = normalize(actual);

			expect(actual).toHaveLength(1);

			expect(element).toEqual({
				'': ['div', '(', { '': ['br'] }, { '': ['br'] }, ')']
			});
		});

		it.skip('conditional', () => {
			const template = parse('<p {object}>({string})</p>');
			const actual = render(template, state, 1);
			const [element] = normalize(actual);

			expect(actual).toHaveLength(1);

			expect(element).toEqual({
				'': ['p', '(abc)']
			});
		});

		it.skip('hidden', () => {
			const template = parse('<p {missing}>({string})</p>');
			const actual = render(template, state, 1);

			expect(actual).toBe('');
		});

		it.skip('iterate', () => {
			const template = parse('<p {array}>({string})</p>');
			const actual = render(template, state, 1);

			expect(actual).toBe([
				'<p data--="1-0">(abc)</p>',
				'<p data--="1-1">(xyz)</p>'
			].join(''));
		});

		it.skip('complex', () => {
			const template = parse(`
				<div {array}>
					<img src="("{string.}")" alt="">
					<br>
					<p>({.number})</p>
				</>
			`);

			const actual = render(template, state, 1);

			expect(backup).toEqual({
				array: [
					{ string: 'abc' },
					{ string: 'xyz' }
				]
			});

			expect(actual).toBe([
				'<div data--="1-0">',
					'<img alt="" src="(abc)">',
					'<br>',
					'<p>(123)</p>',
				'</div>',
				'<div data--="1-1">',
					'<img alt="" src="(xyz)">',
					'<br>',
					'<p>(123)</p>',
				'</div>'
			].join(''));
		});
	});
});
