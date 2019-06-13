import { view } from '../view';
import stew from '../stew';

jest.mock('../view', () => ({ view: jest.fn() }));

describe('stew', () => {
	const actions = jest.fn();
	let object;

	beforeEach(() => {
		view.mockClear().mockReturnValue('view');
		actions.mockClear().mockImplementation(output => {
			object = output;
			return { action: () => 'action' }
		});
	});

	it('should create a state from an object', () => {
		const actual = stew({ key: 'value' }, actions);

		expect(actions).toHaveBeenCalledWith({
			key: 'value',
			action: expect.any(Function)
		});

		expect(actual).toEqual(expect.any(Function));
		expect(actual.action()).toBe('action');
		expect(object.action()).toBe('action');
	});

	it('should create a view from markup', () => {
		const actual = stew('string');

		expect(view).toHaveBeenCalledWith('string');
		expect(actual).toEqual('view');
	});

	it('should not create anything if type is invalid', () => {
		const actual = stew(1);

		expect(view).not.toHaveBeenCalled();
		expect(actual).toBeUndefined();
	});

	describe('view', () => {
		let define;
	
		beforeEach(() => {
			define = stew({ key: 'value' });
			view.mockClear().mockReturnValue('view');
		});

		it('should relate view to a state', () => {
			const actual = define(() => {});

			expect(view).not.toHaveBeenCalled();
			expect(actual).toEqual(expect.any(Function));
		});

		it('should convert markup to a view', () => {
			const actual = define('string');

			expect(view).toHaveBeenCalledWith('string');
			expect(actual).toEqual(expect.any(Function));
		});

		it('should not create anything if type is invalid', () => {
			const actual = define(1);
			expect(actual).toBeUndefined();
		});

		describe('component', () => {
			const render = jest.fn();
			let actions;
		
			beforeEach(() => {
				render.mockClear().mockImplementation((object, key) => {
					object[key];
				});

				actions = state => ({ action: value => state.key = value });
			});

			it('should relate state and view to nodes', () => {
				const object = { key: 'old', other: 'value' };
				const expected = { ...object, action: expect.any(Function) };
				const define = stew(object, actions);
				const actual = define(render);

				actual('key');
				actual('other');

				expect(render.mock.calls).toEqual([
					[expected, 'key'],
					[expected, 'other']
				]);
				
				render.mockClear();
				define.action('new');

				expect(render.mock.calls).toEqual([
					[{ ...expected, key: 'new' }, 'key']
				]);
			});
		});
	});
});
