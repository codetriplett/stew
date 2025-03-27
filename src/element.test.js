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
			expect(ref).toEqual(['div', { '': new Set(['lmno']) }, expect.any(Object), expect.any(Object)]);
			expect(nodes).toEqual([{}, ref[2]]);
			check('<div lmno="456">content</div>');
		});
		
		it('fragment', () => {
			const ref = track(['']);
			renderElement(ref, { lmno: 456 }, ['content'], context, virtualDocument, nodes);
			expect(ref).toEqual(['', {}, undefined, expect.any(Object)]);
			expect(nodes).toEqual([{}, ref[3]]);
			check('content');
		});
	});

	describe('update nodes', () => {
		it('element', () => {
			const ref = ['div'];

			renderElement(ref, {
				abc: 456, lmno: 123,
				style: { abc: 456, lmno: 123 },
				dataset: { abc: 456, lmno: 123 },
			}, ['abc'], context, virtualDocument, nodes);

			track(ref);

			renderElement(ref, {
				lmno: 789, xyz: 456,
				style: { lmno: 789, xyz: 456 },
				dataset: { lmno: 789, xyz: 456 },
			}, ['xyz'], context, virtualDocument, nodes);

			check(
				'<div lmno="789" xyz="456" style="lmno:789;xyz:456;" data-lmno="789" data-xyz="456">xyz</div>',
				['div', { '': new Set(['lmno', 'xyz', 'style', 'style.lmno', 'style.xyz', 'dataset', 'dataset.lmno', 'dataset.xyz']) }, true, true],
			);
		});
		
		it('fragment', () => {
			const ref = [''];
			renderElement(ref, { abc: 456, lmno: 123 }, ['abc'], context, virtualDocument, nodes);
			track(ref);
			renderElement(ref, { lmno: 789, xyz: 456 }, ['xyz'], context, virtualDocument, nodes);
			check('xyz', ['', {}, undefined, true]);
		});
	});

	describe('replace nodes', () => {
		it('element', () => {
			const ref = ['div'];
			renderElement(ref, {}, ['lmno'], context, virtualDocument, nodes);
			track(ref);
			renderElement(ref, {}, [['span', {}, 'lmno']], context, virtualDocument, nodes);
			check('<div><span>lmno</span></div>', ['div', { '': new Set() }, true, false]);
		});
		
		it('fragment', () => {
			const ref = [''];
			renderElement(ref, {}, ['lmno'], context, virtualDocument, nodes);
			track(ref);
			renderElement(ref, {}, [['span', {}, 'lmno']], context, virtualDocument, nodes);
			check('<span>lmno</span>', ['', {}, undefined, false]);
		});
	});

	describe('hydrate nodes', () => {

	});
});
