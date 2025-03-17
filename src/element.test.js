import { virtualDocument } from './dom';
import renderElement, * as elementHelpers from './element';
import { track, check } from './test';

const reconcile = jest.spyOn(elementHelpers, 'reconcile');
const teardown = jest.spyOn(elementHelpers, 'teardown');
let context, nodes;

beforeEach(() => {
	jest.clearAllMocks();
	context = { '': () => {}, abc: 123 };
	nodes = [];
});

// function copy (ref) {
// 	if (typeof ref !== 'object') {
// 		return ref;
// 	} else if (Array.isArray(ref)) {
// 		return ref.map(copy);
// 	}

// 	const object = {};

// 	for (const [name, value] of Object.entries(ref)) {
// 		object[name] = copy(value);
// 	}

// 	return object;
// }

// render(layout, document, container, i, map, context, module)
describe('renderElement', () => {
	describe('create', () => {
		it('element', () => {
			const ref = track(['div']);
			renderElement(ref, { lmno: 456 }, ['content'], context, virtualDocument, nodes);
			expect(ref).toEqual(['div', null, expect.any(Object), expect.any(Object)]);
			check('<div lmno="456">content</div>');
		});
		
		it('fragment', () => {
			const ref = track(['']);
			renderElement(ref, { lmno: 456 }, ['content'], context, virtualDocument, nodes);
			expect(ref).toEqual(['', null, undefined, expect.any(Object)]);
			check('content');
		});
	});

	describe('update nodes', () => {
		it('element', () => {
			const ref = ['div'];
			renderElement(ref, { lmno: 123 }, ['abc'], context, virtualDocument, nodes);
			track(ref);
			renderElement(ref, { lmno: 789 }, ['xyz'], context, virtualDocument, nodes);
			check('<div lmno="789">xyz</div>', ['div', null, true, true]);
		});
		
		it('fragment', () => {
			const ref = [''];
			renderElement(ref, { lmno: 123 }, ['abc'], context, virtualDocument, nodes);
			track(ref);
			renderElement(ref, { lmno: 789 }, ['xyz'], context, virtualDocument, nodes);
			check('xyz', ['', true, undefined, true]);
		});
	});

	describe('replace nodes', () => {
		it('element', () => {
			const ref = ['div'];
			renderElement(ref, {}, ['lmno'], context, virtualDocument, nodes);
			track(ref);
			renderElement(ref, {}, [['span', {}, 'lmno']], context, virtualDocument, nodes);
			check('<div><span>lmno</span></div>', ['div', null, true, false]);
			// expect(teardown).toHaveBeenCalledWith([]);
		});
		
		it('fragment', () => {
			const ref = [''];
			renderElement(ref, {}, ['lmno'], context, virtualDocument, nodes);
			track(ref);
			renderElement(ref, {}, [['span', {}, 'lmno']], context, virtualDocument, nodes);
			check('<span>lmno</span>', ['', true, undefined, false]);
		});
	});
});
