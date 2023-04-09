import stew, { frameworks, virtualDocument, defaultUpdater } from '.';
import reconcile from './view';

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

	it('uses custom document and updater', () => {
		let frameworkStack;

		reconcile.mockImplementation(() => {
			frameworkStack = [...frameworks];
		});

		const outline = ['div', 'Hello Page'];
		const updater = () => {};
		const framework = [virtualDocument, updater, {}];
		stew(container, outline, framework);
		expect(frameworkStack).toEqual([framework]);
	});

	it('hydrates content', () => {
		container.appendChild(node);
		const updater = () => {};
		const framework = [virtualDocument, updater, {}];
		const outline = ['div', 'Hello Page'];
		const view = Object.assign([container], { keyedViews: {} });
		stew(container, outline, framework);
		expect(reconcile).toHaveBeenCalledWith(outline, {}, view, 0, { container }, [node]);
	});

	it('creates fragment container', () => {
		const outline = ['div', 'Hello Page'];
		const updater = () => {};
		const framework = [virtualDocument, updater, {}];
		const container = stew('', outline, framework);

		expect(container).toEqual({
			childNodes: [],
			appendChild: expect.anything(),
			insertBefore: expect.anything(),
			removeChild: expect.anything(),
			toString: expect.anything(),
		});
	});
});
