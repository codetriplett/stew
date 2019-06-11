import { state } from '../state';
import stew from '../stew';

describe('stew', () => {
	const view = jest.fn();

	beforeEach(() => {
		view.mockClear().mockImplementation(object => object.key);
	});

	it('should relate a state to a view', () => {
		const object = state({ key: 'old' });
		
		stew(object, view, 'parameter');
		expect(view).toHaveBeenCalledWith({ key: 'old' }, 'parameter');

		object.key = 'new';
		expect(view).toHaveBeenCalledWith({ key: 'new' }, 'parameter');
	});
});
