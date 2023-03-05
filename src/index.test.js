import stew, { virtualDocument } from '.';
import { documents } from './execute';
import reconcile from './reconcile';

jest.mock('./reconcile');

describe('stew', () => {
	let container, state, node;

	beforeEach(() => {
		container = virtualDocument.createElement('div');
		state = {};
		node = virtualDocument.createElement('div');
		jest.clearAllMocks();
		reconcile.mockReturnValue(node);
	});

	it('hydrates content', () => {
		const outline = ['div', 'Hello Page'];
		const actual = stew(container, outline, state);
		expect(actual).toBe(container);
		expect(reconcile).toHaveBeenCalledWith(outline, state, [container, {}], 0, [], actual);
	});

	it('uses default document', () => {
		let documentStack;

		reconcile.mockImplementation(() => {
			documentStack = [...documents];
		});

		const outline = ['div', 'Hello Page'];
		stew(container, outline, state);
		expect(documentStack).toEqual([document]);
	});

	it('uses custom document', () => {
		let documentStack;

		reconcile.mockImplementation(() => {
			documentStack = [...documents];
		});

		const outline = ['div', 'Hello Page'];
		stew(container, outline, state, virtualDocument);
		expect(documentStack).toEqual([virtualDocument]);
	});
});
