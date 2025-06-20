import stew from './stew';
import { track, check } from './validate';
import renderElement from './element';

let context, container, nodes;

beforeEach(() => {
	context = { '': () => {}, abc: 123 };
	container = stew.createElement('div');
	nodes = [container];
});

describe('renderElement', () => {
	describe('create', () => {
		it('element', () => {
			const ref = track(['div']);
			renderElement(ref, { lmno: 456 }, ['content'], context, stew, nodes);
			expect(ref).toEqual(['div', { '': new Set(['lmno']) }, expect.any(Object), expect.any(Object)]);
			expect(nodes).toEqual([container, ref[2]]);
			check('<div lmno="456">content</div>');
		});
		
		it('fragment', () => {
			const ref = track(['']);
			renderElement(ref, { lmno: 456 }, ['content'], context, stew, nodes);
			expect(ref).toEqual(['', {}, undefined, expect.any(Object)]);
			expect(nodes).toEqual([container, ref[3]]);
			check('content');
		});

		it('boolean attribute', () => {
			const ref = track(['div']);
			renderElement(ref, { lmno: true }, ['content'], context, stew, nodes);
			expect(ref).toEqual(['div', { '': new Set(['lmno']) }, expect.any(Object), expect.any(Object)]);
			expect(nodes).toEqual([container, ref[2]]);
			check('<div lmno>content</div>');
		});

		it('empty string attribute', () => {
			const ref = track(['div']);
			renderElement(ref, { lmno: '' }, ['content'], context, stew, nodes);
			expect(ref).toEqual(['div', { '': new Set(['lmno']) }, expect.any(Object), expect.any(Object)]);
			expect(nodes).toEqual([container, ref[2]]);
			check('<div lmno="">content</div>');
		});

		it('style attribute', () => {
			const ref = track(['div']);
			renderElement(ref, { style: { lmno: 456 } }, ['content'], context, stew, nodes);
			expect(ref).toEqual(['div', { '': new Set(['style', 'style.lmno']) }, expect.any(Object), expect.any(Object)]);
			expect(nodes).toEqual([container, ref[2]]);
			check('<div style="lmno:456;">content</div>');
		});
	});

	describe('update nodes', () => {
		it('element', () => {
			const ref = ['div'];

			renderElement(ref, {
				abc: 456, lmno: 123,
				style: { abc: 456, lmno: 123 },
				dataset: { abc: 456, lmno: 123 },
			}, ['abc'], context, stew, nodes);

			track(ref);

			renderElement(ref, {
				lmno: 789, xyz: 456,
				style: { lmno: 789, xyz: 456 },
				dataset: { lmno: 789, xyz: 456 },
			}, ['xyz'], context, stew, nodes);

			check(
				'<div lmno="789" xyz="456" style="lmno:789;xyz:456;" data-lmno="789" data-xyz="456">xyz</div>',
				['div', { '': new Set(['lmno', 'xyz', 'style', 'style.lmno', 'style.xyz', 'dataset', 'dataset.lmno', 'dataset.xyz']) }, true, true],
			);
		});
		
		it('fragment', () => {
			const ref = [''];
			renderElement(ref, { abc: 456, lmno: 123 }, ['abc'], context, stew, nodes);
			track(ref);
			renderElement(ref, { lmno: 789, xyz: 456 }, ['xyz'], context, stew, nodes);
			check('xyz', ['', {}, undefined, true]);
		});

		it('clears attributes', () => {
			const ref = ['div'];

			renderElement(ref, {
				abc: 456, lmno: 123,
				style: { abc: 456, lmno: 123 },
				dataset: { abc: 456, lmno: 123 },
			}, ['abc'], context, stew, nodes);

			track(ref);

			renderElement(ref, {}, ['xyz'], context, stew, nodes);

			check(
				'<div>xyz</div>',
				['div', { '': new Set() }, true, true],
			);
		});

		it('clears attributes onclick', () => {
			const ref = ['div'];

			renderElement(ref, {
				abc: 456, lmno: 123,
				style: { abc: 456, lmno: 123 },
				dataset: { abc: 456, lmno: 123 },
				onclick: {},
			}, ['abc'], context, stew, nodes);

			track(ref);
			ref[2].onclick();
			
			renderElement(ref, {
				onclick: {
					xyz: 789,
				},
			}, ['xyz'], context, stew, nodes);

			check(
				'<div xyz="789">xyz</div>',
				['div', { '': new Set(['', 'ref', 'xyz']) }, true, true],
			);
		});

		it('updates attribures after onclick', () => {
			const ref = ['div'];

			renderElement(ref, {
				abc: 456, lmno: 123,
				style: { abc: 456, lmno: 123 },
				dataset: { abc: 456, lmno: 123 },
				onclick: {},
			}, ['abc'], context, stew, nodes);

			track(ref);
			ref[2].onclick();

			check(
				'<div>abc</div>',
				['div', { '': new Set(['', 'ref']) }, true, true],
			);
		});
	});

	describe('replace nodes', () => {
		it('element', () => {
			const ref = ['div'];
			renderElement(ref, {}, ['lmno'], context, stew, nodes);
			track(ref);
			renderElement(ref, {}, [['span', {}, 'lmno']], context, stew, nodes);
			check('<div><span>lmno</span></div>', ['div', { '': new Set() }, true, false]);
		});
		
		it('fragment', () => {
			const ref = [''];
			renderElement(ref, {}, ['lmno'], context, stew, nodes);
			track(ref);
			renderElement(ref, {}, [['span', {}, 'lmno']], context, stew, nodes);
			check('<span>lmno</span>', ['', {}, undefined, false]);
		});
	});

	describe('hydrate nodes', () => {

	});
});
