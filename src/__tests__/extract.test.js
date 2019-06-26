import { extract } from '../extract';

function createElement (html) {
	const container = document.createElement('div');
	container.innerHTML = Array.isArray(html) ? html.join('') : html;
	return container.children[0];
}

describe('extract', () => {
	let object;

	beforeEach(() => {
		object = {};
	});

	it('should extract property', () => {
		extract(['(', 'string', ')'], '(value)', object);
		expect(object).toEqual({ string: 'value' });
	});

	it('should extract property without suffix', () => {
		extract(['(', 'string', ''], '(value)', object);
		expect(object).toEqual({ string: 'value)' });
	});

	it('should extract property without prefix', () => {
		extract(['', 'string', ')'], '(value)', object);
		expect(object).toEqual({ string: '(value' });
	});

	it('should extract property without prefix or suffix', () => {
		extract(['', 'string', ''], '(value)', object);
		expect(object).toEqual({ string: '(value)' });
	});

	it('should ignore string template', () => {
		extract('value', 'value', object);
		expect(object).toEqual({});
	});

	it('should ignore array template with invalid reference', () => {
		extract(['', 'string', ''], createElement('<div></div>'), object);
		expect(object).toEqual({});
	});

	it('should ignore object template with invalid reference', () => {
		extract({ '': ['div', '', []] }, 'value', object);
		expect(object).toEqual({});
	});

	it('should extract attributes', () => {
		extract(
			{ src: ['http://', 'domain', '.com'], '': ['img', ''] },
			createElement('<img src="http://image.com">'),
			object
		);

		expect(object).toEqual({ domain: 'image' });
	});

	it('should extract from text node', () => {
		extract(
			{ '': ['p', '', [['', 'content', '']]] },
			createElement('<p>Lorem ipsum.</p>'),
			object
		);

		expect(object).toEqual({ content: 'Lorem ipsum.' });
	});

	it('should extract from child element', () => {
		extract(
			{ '': ['div', '', [
				['', 'content', '']
			]] },
			createElement('<p>Lorem ipsum.</p>'),
			object
		);

		expect(object).toEqual({ content: 'Lorem ipsum.' });
	});
});
