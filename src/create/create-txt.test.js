import { createTxt } from './create-txt';

describe('create-txt', () => {
	it('creates new text', () => {
		const actual = createTxt('abc', { '': [] });
		const text = document.createTextNode('abc');
		expect(actual).toEqual({ '': ['abc', text] });
	});

	it('hydrates existing text', () => {
		const text = document.createTextNode('abc');
		const nodes = [text];
		const actual = createTxt('abc', { '': [,,, nodes] });

		expect(nodes).toHaveLength(0);
		expect(actual).toEqual({ '': ['abc', text] });
		expect(actual[''][1]).toBe(text);
	});
});
