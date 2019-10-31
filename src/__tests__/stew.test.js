import { parse } from '../parse';
import { render } from '../render';
import { hydrate } from '../hydrate';
import stew, { components, actions } from '../stew';

jest.mock('../parse', () => ({ parse: jest.fn() }));
jest.mock('../render', () => ({ render: jest.fn() }));
jest.mock('../hydrate', () => ({ hydrate: jest.fn() }));

describe('stew', () => {
	let template;
	let data;
	let state;
	let html;
	let element;

	beforeEach(() => {
		template = { '': ['name', 'br'] };
		data = { key: 'value' };
		state = { '': expect.anything(), '.': expect.anything() };
		html = '<br data--=\'name\'>';
		document.body.innerHTML = html;
		element = document.body.childNodes[0];

		window.fetch = jest.fn().mockReturnValue(Promise.resolve(data));
		parse.mockClear().mockReturnValue(template);
		render.mockClear().mockReturnValue(html);
		hydrate.mockClear();

		for (const key in components) {
			delete components[key];
		}

		for (const key in actions) {
			delete actions[key];
		}
	});

	it('parses markup', () => {
		const actual = stew('<br>', 'name');
		expect(actual).toEqual(template);
	});
 
	it('renders element syncronously', () => {
		const actual = stew(template);

		expect(render).toHaveBeenCalledWith(state, template, '', undefined);
		expect(actual).toBe(html);
	});
 
	it('renders element asyncronously', () => {
		components.name = template;
		state['..'] = true;

		return stew('name').then(actual => {
			expect(render).toHaveBeenCalledWith(state, template, '', undefined);
			expect(actual).toBe(html);
		});
	});
 
	it('fetches data', () => {
		components.name = template;
		state['..'] = true;

		return stew('/data').then(actual => {
			expect(fetch).toHaveBeenCalledWith('/data.json');
			expect(actual).toBe(data);
		});
	});

	it('hydrates element', () => {
		components.name = template;
		stew(element);

		expect(hydrate).toHaveBeenCalledWith(element, undefined);
	});

	it('registers template', () => {
		stew(template, 'name');

		expect(components.name).toBe(template);
		expect(hydrate).toHaveBeenCalledWith(element, undefined);
	});

	it('registers action', () => {
		const action = jest.fn().mockReturnValue({ key: 'output' });
		const template = stew('name', action);
		stew(template, 'name');
		const actual = actions.name;

		expect(actual).toEqual(expect.any(Function));
		actual(element, { key: 'input' });
		expect(action).toHaveBeenCalledWith({ key: 'input' });
		expect(hydrate).toHaveBeenCalledWith(element, { key: 'output' });
	});
});
