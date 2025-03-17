import { virtualDocument } from './dom';
import * as elementHelpers from './element';
import renderImpulse, { impulses } from './impulse';
import { track, check } from './test';

const reconcile = jest.spyOn(elementHelpers, 'reconcile');
const teardown = jest.spyOn(elementHelpers, 'teardown');

let context, parentNode, nodes, callback, layout, impulse, unsubscribe;

beforeEach(() => {
	jest.clearAllMocks();
	context = {};
	parentNode = virtualDocument.createElement('div');
	nodes = [parentNode];
	layout = undefined;
	impulse = undefined;
	unsubscribe = jest.fn();
	
	callback = (props, ...children) => {
		[impulse] = impulses[0];
		return layout || ['div', props, ...children];
	};
});

describe('renderImpulse', () => {
	it('creates impulse', () => {
		const ref = track([callback]);
		renderImpulse(ref, { lmno: 456 }, ['content'], context, virtualDocument, nodes);
		check('<div lmno="456">content</div>');
		expect(nodes).toEqual([parentNode, ref[2][2]]);
		expect(unsubscribe).not.toHaveBeenCalled();
		expect(reconcile).not.toHaveBeenCalled();
		expect(teardown).not.toHaveBeenCalled();
	});
	
	it('reuses impulse', () => {
		const ref = track([callback, {}]);
		renderImpulse(ref, { lmno: 456 }, ['content'], context, virtualDocument, nodes);
		check('<div lmno="456">content</div>', [true, true, false]);
		expect(nodes).toEqual([parentNode, ref[2][2]]);
		expect(unsubscribe).not.toHaveBeenCalled();
		expect(reconcile).not.toHaveBeenCalled();
		expect(teardown).not.toHaveBeenCalled();
	});

	it('updates itself', () => {
		const ref = [callback, {}, undefined, unsubscribe];
		renderImpulse(ref, { lmno: 123 }, ['abc'], context, virtualDocument, nodes);
		track(ref);
		layout = ['div', { lmno: 789 }, 'xyz'];
		impulse();
		check('<div lmno="789">xyz</div>', [true, true, true, true]);
		expect(unsubscribe).toHaveBeenCalled();
		expect(reconcile).toHaveBeenCalledWith(parentNode, [ref[2][2]], [ref[2][2]]);
		expect(teardown).not.toHaveBeenCalled();
	});

	it('replaces content', () => {
		const ref = [callback, {}, undefined, unsubscribe];
		renderImpulse(ref, { lmno: 123 }, ['abc'], context, virtualDocument, nodes);
		track(ref);
		const prevProxy = ref[2];
		layout = 'xyz';
		impulse();
		check('xyz', [true, true, false, true]);
		expect(unsubscribe).toHaveBeenCalled();
		expect(reconcile).toHaveBeenCalledWith(parentNode, [ref[2]], [prevProxy[2]]);
		expect(teardown).toHaveBeenCalledWith(prevProxy);
	});
});
