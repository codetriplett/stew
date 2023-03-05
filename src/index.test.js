import stew, { defaultDocument } from '.';
import { documents } from './execute';
import reconcile from './reconcile';

jest.mock('./reconcile');

describe('stew', () => {
	let state, node;

	beforeEach(() => {
		state = {};
		node = defaultDocument.createElement('div');
		jest.clearAllMocks();
		reconcile.mockReturnValue(node);
	});

	it('replaces content', () => {
		const outline = ['div', 'Hello Page'];
		const actual = stew(outline, state);

		expect(actual).toEqual({
			childNodes: [],
			appendChild: expect.anything(),
			insertBefore: expect.anything(),
			toString: expect.anything(),
		});

		expect(reconcile).toHaveBeenCalledWith(outline, state, [, {}], 0, actual, [], {});
	});

	it('hydrates content', () => {
		const outline = ['div', 'Hello Page'];
		const actual = stew(outline, state, node);

		expect(actual).toEqual({
			tagName: 'div',
			childNodes: [],
			appendChild: expect.anything(),
			insertBefore: expect.anything(),
			toString: expect.anything(),
		});

		expect(reconcile).toHaveBeenCalledWith(outline, state, [, {}], 0, actual, [], undefined);
	});

	it('uses default document', () => {
		let documentStack;

		reconcile.mockImplementation(() => {
			documentStack = [...documents];
		});

		const outline = ['div', 'Hello Page'];
		const actual = stew(outline, state, node);
		expect(actual).toEqual(node);
		expect(reconcile).toHaveBeenCalledWith(outline, state, [, {}], 0, node, [], undefined);
		expect(documentStack).toEqual([defaultDocument]);
	});

	it('uses custom document', () => {
		const customDocument = {};
		let documentStack;

		reconcile.mockImplementation(() => {
			documentStack = [...documents];
		});

		const outline = ['div', 'Hello Page'];
		const actual = stew(outline, state, node, customDocument);
		expect(actual).toEqual(node);
		expect(reconcile).toHaveBeenCalledWith(outline, state, [, {}], 0, node, [], undefined);
		expect(documentStack).toEqual([customDocument]);
	});
});
