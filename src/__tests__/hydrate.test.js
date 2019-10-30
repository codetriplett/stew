import { components } from '../stew';
import { render } from '../render';
import { hydrate } from '../hydrate';

jest.mock('../stew', () => ({ components: { name: { '': ['img'] } } }));
jest.mock('../render', () => ({ render: jest.fn() }));

describe('hydrate', () => {
	let element;
	let state;

	beforeEach(() => {
		render.mockClear();

		document.body.innerHTML = '<br data--=\'name {"key":1}\'>';
		element = document.body.childNodes[0];
		state = { '': expect.anything(), '.': expect.anything(), key: 1 };
	});

	it('activates element', () => {
		hydrate(element);
		expect(render).toHaveBeenCalledWith(state, { '': ['img'] }, '', element);
	});
});
