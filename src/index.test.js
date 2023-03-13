import stew, { virtualDocument, defaultUpdater } from '.';
import { frameworks } from './activate';
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

	it('uses default document and updater', () => {
		let frameworkStack;

		reconcile.mockImplementation(() => {
			frameworkStack = [...frameworks];
		});

		const outline = ['div', 'Hello Page'];
		stew(container, outline);
		expect(frameworkStack).toEqual([[document, defaultUpdater]]);
	});

	it('uses custom document and updater', () => {
		let frameworkStack;

		reconcile.mockImplementation(() => {
			frameworkStack = [...frameworks];
		});

		const outline = ['div', 'Hello Page'];
		const updater = () => {};
		stew(container, outline, virtualDocument, updater);
		expect(frameworkStack).toEqual([[virtualDocument, updater]]);
	});

	it('hydrates content', () => {
		container.appendChild(node);
		const outline = ['div', 'Hello Page'];
		const actual = stew(container, outline, virtualDocument);
		expect(actual).toBe(container);
		expect(reconcile).toHaveBeenCalledWith(outline, {}, [container, {}], 0, { container }, [node]);
	});
});
