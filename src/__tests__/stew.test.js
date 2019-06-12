import { view } from '../view';
import stew from '../stew';

jest.mock('../view', () => ({ view: jest.fn() }));

describe('stew', () => {
	beforeEach(() => {
		view.mockClear().mockReturnValue('view');
	});

	it('should create a state from an object', () => {
		const object = { key: 'value' };
		const actual = stew(object);

		expect(object).toEqual({ key: 'value' });
		expect(actual).toEqual(expect.any(Function));
		expect(actual.key).toBe('value');
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
		let object;
	
		beforeEach(() => {
			object = stew({ key: 'value' });
			view.mockClear().mockReturnValue('view');
		});

		it('should relate view to a state', () => {
			const actual = object(() => {});

			expect(view).not.toHaveBeenCalled();
			expect(actual).toEqual(expect.any(Function));
		});

		it('should convert markup to a view', () => {
			const actual = object('string');

			expect(view).toHaveBeenCalledWith('string');
			expect(actual).toEqual(expect.any(Function));
		});

		it('should not create anything if type is invalid', () => {
			const actual = object(1);
			expect(actual).toBeUndefined();
		});

		describe('component', () => {
			const action = jest.fn();
		
			beforeEach(() => {
				action.mockClear().mockImplementation((object, key) => {
					object[key];
				});
			});

			it('should relate state and view to nodes', () => {
				const object = { key: 'old', other: 'value' };
				const actual = stew(object)(action);

				actual('key');
				actual('other');

				expect(action.mock.calls).toEqual([
					[object, 'key'],
					[object, 'other']
				]);
				
				action.mockClear();
				object.key = 'new';

				expect(action.mock.calls).toEqual([
					[object, 'key']
				]);
			});

			it('should allow updates on function', () => {
				const state = stew({ key: 'old' })(action)('key');

				expect(action).toHaveBeenCalledWith({ key: 'old' }, 'key');
				
				action.mockClear();
				state.key = 'new';

				expect(action).toHaveBeenCalledWith({ key: 'new' }, 'key');
			});
		});
	});
});
