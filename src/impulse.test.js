import { track, check, text, fragment, element } from './test';
import { virtualDocument } from './document';
import renderImpulse, { impulses, processFollowups, onRender } from './impulse';

let context, node, nodes, callback, layout, impulse, unsubscribe;

beforeEach(() => {
	jest.clearAllMocks();
	context = {};
	node = virtualDocument.createElement('div');
	nodes = [node];
	layout = undefined;
	impulse = undefined;
	
	callback = (props, ...children) => {
		[impulse] = impulses[0];
		return layout || ['div', props, ...children];
	};
});

describe('processFollowups', () => {

});

describe('renderImpulse', () => {
	it('creates impulse', () => {
		const ref = track([callback]);
		renderImpulse(ref, { lmno: 456 }, ['content'], context, virtualDocument, nodes);
		check('<div lmno="456">content</div>');
		expect(nodes).toEqual([node, ref[2][2][2]]);
		
		expect(ref).toEqual([callback, {}, [
			expect.any(Function),
			new Set(),
			['div', null,
				{ ...element, tagName: 'DIV', lmno: 456, childNodes: [
					{ ...text, nodeValue: 'content' },
				] },
				...ref[2][2][2].childNodes,
			],
		]]);
	});
	
	it('reuses impulse', () => {
		const memo = {};
		const ref = track([callback, memo, [() => {}, new Set()]]);
		renderImpulse(ref, { lmno: 456 }, ['content'], context, virtualDocument, nodes);
		check('<div lmno="456">content</div>', [true, true, [false, true, false]]);
		expect(nodes).toEqual([node, ref[2][2][2]]);
	});

	it('updates itself', () => {
		const ref = [callback, {}, [() => {}, new Set()]];
		renderImpulse(ref, { lmno: 123 }, ['abc'], context, virtualDocument, nodes);
		node.appendChild(nodes[1]);
		track(ref);
		layout = ['div', { lmno: 789 }, 'xyz'];
		impulse();
		check('<div lmno="789">xyz</div>', [true, true, [true, true, [true, true, true, true]]]);
		expect(String(node)).toEqual('<div><div lmno="789">xyz</div></div>');
	});

	it('replaces content', () => {
		const ref = [callback, {}, [() => {}, new Set()]];
		renderImpulse(ref, { lmno: 123 }, ['abc'], context, virtualDocument, nodes);
		node.appendChild(nodes[1]);
		track(ref);
		layout = 'xyz';
		impulse();
		check('xyz', [true, true, [true, true, false]]);
		expect(String(node)).toEqual('<div>xyz</div>');
	});
});
