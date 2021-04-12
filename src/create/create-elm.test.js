import { createElm } from './create-elm';

describe('create-elm', () => {
	it('creates new node', () => {
		const actual = createElm('div', { '': [] });
		const div = document.createElement('div');
		expect(actual).toEqual({ '': [[], div, 'div', undefined] });
	});

	it('hydrates existing node', () => {
		const div = document.createElement('div');
		const img = document.createElement('img');
		div.appendChild(img);
		const nodes = [div];
		const actual = createElm('div', { '': [,,, nodes] });

		expect(nodes).toHaveLength(0);
		expect(actual).toEqual({ '': [[], div, 'div', [img]] });
		expect(actual[''][1]).toBe(div);
	});
});
