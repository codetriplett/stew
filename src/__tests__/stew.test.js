import { state } from '../state';
import { view } from '../view';
import stew from '../stew';

jest.mock('../state', () => ({ state: jest.fn() }));
jest.mock('../view', () => ({ view: jest.fn() }));

describe('stew', () => {
	const actions = jest.fn();
	const action = jest.fn();
	let store;

	beforeEach(() => {
		state.mockClear().mockReturnValue('state');
		view.mockClear().mockReturnValue('view');
		action.mockClear();

		actions.mockClear().mockImplementation(output => {
			store = output;
			return { action };
		});
	});

	it('should set up actions', () => {
		const actual = stew(actions);

		expect(actions).toHaveBeenCalledWith(store);
		expect(actual).toEqual(expect.any(Function));
		expect(actual.action).toEqual(expect.any(Function));
		expect(store.action).toEqual(expect.any(Function));

		actual.action('one', 'two');

		expect(action).toHaveBeenCalledWith('one', 'two');
	});

	it('should create a store from an object', () => {
		const actual = stew({ key: 'value'}, 'extra');

		expect(state).toHaveBeenCalledWith({ key: 'value'}, 'extra');
		expect(actual).toEqual('state');
	});

	it('should create a view from string', () => {
		const actual = stew('string', 'extra');

		expect(view).toHaveBeenCalledWith('string', 'extra');
		expect(actual).toEqual('view');
	});

	it('should create a view from nothing', () => {
		const actual = stew();

		expect(view).toHaveBeenCalledWith(undefined);
		expect(actual).toEqual('view');
	});

	it('should not create anything if type is invalid', () => {
		const actual = stew(1);

		expect(state).not.toHaveBeenCalled();
		expect(view).not.toHaveBeenCalled();
		expect(actions).not.toHaveBeenCalled();
		expect(actual).toBeUndefined();
	});

	describe('register', () => {
		it('should return create function', () => {
			const register = stew(() => {});
			const actual = register(() => {});

			expect(actual).toEqual(expect.any(Function));
		});

		describe('create', () => {
			it('should relate state and view to nodes', () => {
				const extract = jest.fn();
				let update;
				let resolve;
				let transform;
				
				state.mockClear().mockImplementation((a, output) => {
					resolve = output;
					return 'state';
				});
				
				view.mockClear().mockImplementation((a, b, output) => {
					transform = output;
					return extract;
				});

				const mount = jest.fn().mockImplementation(output => {
					update = output;
				});

				const output = jest.fn();
				const register = stew(() => ({ action: () => resolve() }));
				const create = register(mount);
				const actual = create('one', 'two', 'three');
				const expected = { action: expect.any(Function) };

				expect(view).toHaveBeenCalledWith('one', 'two', transform);
				expect(extract).toHaveBeenCalledWith(document);
				expect(actual).toEqual(expect.any(Function));

				transform('props', 'element');

				expect(mount).toHaveBeenCalledWith(
					expect.any(Function),
					'element',
					'three'
				);

				update(output);

				expect(state).toHaveBeenCalledWith(
					'props',
					resolve,
					expected
				);

				register.action();

				expect(output).toHaveBeenCalledWith(expected);

				update();

				expect(state).toHaveBeenCalledWith(
					'props',
					resolve,
					expected
				);
			});
		});
	});
});
