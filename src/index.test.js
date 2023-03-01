import stew, { defaultDocument } from '.';
import resolve from './resolve';

jest.mock('./resolve');

describe('stew', () => {
	let state, node;

	beforeEach(() => {
		state = {};
		node = {};
		jest.clearAllMocks();
		resolve.mockReturnValue(node);
	});

	it('uses default document', () => {
		const actual = stew();
		expect(actual).toEqual(expect.any(Function));
		const template = ['div', 'Hello Page'];
		const result = actual(template, state, node);
		expect(result).toEqual(node);

		expect(resolve).toHaveBeenCalledWith(template, {
			document: defaultDocument,
			state,
		}, [node, {}], 0);
	});

	it('uses custom document', () => {
		const customDocument = {};
		const actual = stew(customDocument);
		expect(actual).toEqual(expect.any(Function));
		const template = ['div', 'Hello Page'];
		const result = actual(template, state, node);
		expect(result).toEqual(node);

		expect(resolve).toHaveBeenCalledWith(template, {
			document: customDocument,
			state,
		}, [node, {}], 0);
	});
});
