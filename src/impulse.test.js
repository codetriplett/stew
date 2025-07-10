import { track, check, text, fragment, element } from './validate';
import stew from './stew';
import renderImpulse, { stack, processMemo, processFollowups, useEffect } from './impulse';

let context, node, nodes, callback, layout, impulse, unsubscribe;

beforeEach(() => {
	jest.clearAllMocks();
	globalThis.requestAnimationFrame = setTimeout;
	stack.splice(0, stack.length, [, [() => {}, new Set()],, []]);
	context = {};
	node = stew.createElement('div');
	nodes = [node];
	layout = undefined;
	impulse = undefined;
	
	callback = (props, ...children) => {
		[impulse] = stack[0][1];
		return layout || ['div', props, ...children];
	};
});

// TODO: test memo calls
// const value = stew(() => {}, []): useMemo
// const state = stew({ ...props }, []): useMemoState
// const data = stew(() => {}, [], { ...props }): useFetch (props serve as fallback values before promise finishes)
// const Component = stew(() => import('/component'), [], null): useAsyncComponent (null will be the initial value until code is loaded)
// stew(null, [], () => {}): useEffect (no return value) null means no immediate effect

// await stew(): onRender (has moved to stew code instead of memo code)

describe('processMemo', () => {
	it('processes markdown', () => {
		const actual = processMemo('# lmno\n:smile:', ['/', { default: [() => null, { smile: ':)' }] }]);

		expect(actual).toEqual(['', {
			'': 'h#lmno',
			lmno: ['h1', 'lmno'],
		},
			[1, { id: 'lmno' },
				['a', { href: '#lmno' }, 'lmno'],
			],
			['p', null, ':)'],
		]);
	});

	it('processes state', () => {
		const actual = processMemo({ lmno: 456 }, []);
		expect(actual).toEqual({ lmno: 456 });
	});
});

describe('processFollowups', () => {

});

describe('renderImpulse', () => {
	it('creates impulse', () => {
		const ref = track([callback]);
		renderImpulse(ref, { lmno: 456 }, ['content'], context, stew, nodes);
		check('<div lmno="456">content</div>');
		expect(nodes).toEqual([node, ref[2][2]]);
		
		expect(ref).toEqual([callback,
			[expect.any(Function), new Set(), stack[0][1]],
			['div', { '': new Set(['lmno']) },
				{ ...element, tagName: 'DIV', lmno: 456, childNodes: [
					{ ...text, nodeValue: 'content' },
				] },
				...ref[2][2].childNodes,
			],
		]);
	});
	
	it('reuses impulse', () => {
		const ref = track([callback, [() => {}, new Set()]]);
		renderImpulse(ref, { lmno: 456 }, ['content'], context, stew, nodes);
		check('<div lmno="456">content</div>', [true, [false, true], false]);
		expect(nodes).toEqual([node, ref[2][2]]);
	});

	it('updates itself', () => {
		const ref = [callback, [() => {}, new Set()]];
		renderImpulse(ref, { lmno: 123 }, ['abc'], context, stew, nodes);
		node.appendChild(nodes[1]);
		track(ref);
		layout = ['div', { lmno: 789 }, 'xyz'];
		impulse();
		check('<div lmno="789">xyz</div>', [true, [true, true], false]);
		expect(String(node)).toEqual('<div><div lmno="789">xyz</div></div>');
	});

	it('replaces content', () => {
		const ref = [callback, [() => {}, new Set()]];
		renderImpulse(ref, { lmno: 123 }, ['abc'], context, stew, nodes);
		node.appendChild(nodes[1]);
		track(ref);
		layout = 'xyz';
		impulse();
		check('xyz', [true, [true, true], false]);
		expect(String(node)).toEqual('<div>xyz</div>');
	});
});
