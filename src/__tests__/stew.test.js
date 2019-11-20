import { parse } from '../parse';
import { render } from '../render';
import { hydrate } from '../hydrate';
import { stringify } from '../stringify';
import { server, read } from '../server';
import stew, { components, actions } from '../stew';

jest.mock('../parse', () => ({ parse: jest.fn() }));
jest.mock('../render', () => ({ render: jest.fn() }));
jest.mock('../hydrate', () => ({ hydrate: jest.fn() }));
jest.mock('../stringify', () => ({ stringify: jest.fn() }));
jest.mock('../server', () => ({ server: jest.fn(), read: jest.fn() }));

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
		stringify.mockClear().mockReturnValue('{key:\'value\'}');
		server.mockClear();

		read.mockClear().mockImplementation((path, encoding, callback) => {
			callback('{"key":"value"}');
		});

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

		expect(render).toHaveBeenCalledWith(state, template, '', '');
		expect(actual).toBe(html);
	});
 
	it('renders element asyncronously', () => {
		components.name = template;
		state['..'] = [true, [], 'name'];

		return stew('name', { '..': [true, []] }).then(actual => {
			expect(render).toHaveBeenCalledWith(state, template, '', '');
			expect(actual).toBe(html);
		});
	});
 
	it('fetches data', () => {
		components.name = template;
		state['..'] = true;

		return stew('/data').then(actual => {
			expect(read).toHaveBeenCalledWith(
				'/data.json', 'utf-8', expect.any(Function)
			);

			expect(actual).toEqual(data);
		});
	});

	it('registers action', () => {
		const action = jest.fn().mockReturnValue({ key: 'output' });
		const template = stew('name', action);
		stew(template, 'name');
		const actual = actions.name;

		expect(actual).toEqual(expect.any(Function));
		actual({ key: 'input' });
		expect(action).toHaveBeenCalledWith({ key: 'input' });
	});
});
