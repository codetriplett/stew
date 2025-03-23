import { track, check } from './test';
import { virtualDocument } from './document';
import renderElement from './element';

let context, nodes;

beforeEach(() => {
	context = { '': () => {}, abc: 123 };
	nodes = [{}];
});

describe('renderElement', () => {
	describe('create', () => {
		it('element', () => {
			const ref = track(['div']);
			renderElement(ref, { lmno: 456 }, ['content'], context, virtualDocument, nodes);
			expect(ref).toEqual(['div', null, expect.any(Object), expect.any(Object)]);
			expect(nodes).toEqual([{}, ref[2]]);
			check('<div lmno="456">content</div>');
		});
		
		it('fragment', () => {
			const ref = track(['']);
			renderElement(ref, { lmno: 456 }, ['content'], context, virtualDocument, nodes);
			expect(ref).toEqual(['', null, undefined, expect.any(Object)]);
			expect(nodes).toEqual([{}, ref[3]]);
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
		});
		
		it('fragment', () => {
			const ref = [''];
			renderElement(ref, {}, ['lmno'], context, virtualDocument, nodes);
			track(ref);
			renderElement(ref, {}, [['span', {}, 'lmno']], context, virtualDocument, nodes);
			check('<span>lmno</span>', ['', true, undefined, false]);
		});
	});

	describe('hydrate nodes', () => {

	});
});
