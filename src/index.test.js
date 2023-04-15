import stew from '.';

// TODO: write integration tests
describe('stew', () => {
	it('renders fragment', () => {
		const actual = stew('', ['div'], []);
		expect(String(actual)).toEqual('<div></div>');
	});
});
