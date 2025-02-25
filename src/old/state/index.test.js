import createState, { queue } from '.';
import { frameworks, virtualFramework } from '../view/dom';
import { fibers } from './fiber';

describe('createState', () => {
	const impulse = jest.fn();
	let fiber;

	beforeEach(() => {
		global.requestAnimationFrame = callback => setTimeout(callback, 0);
		jest.clearAllMocks();
		fiber = Object.assign([impulse], { registry: new Set() });
		frameworks.splice(0, frameworks.length, virtualFramework);
		fibers.splice(0, fibers.length, fiber);
	});

	it('reacts to changes to read properties', async () => {
		const actual = createState({ str: 'abc' });
		const before = actual.str;
		expect(before).toEqual('abc');
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(impulse).not.toHaveBeenCalled();
		actual.str = 'xyz';
		expect(queue).toEqual(new Set([fiber]));
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(impulse).toHaveBeenCalledWith();
		const after = actual.str;
		expect(after).toEqual('xyz');
	});
	
	it('prevents duplicate executions', async () => {
		const actual = createState({ str: 'abc', num: 123 });
		actual.str;
		actual.str;
		actual.num;
		actual.num;
		actual.str = 'lmno';
		actual.str = 'xyz';
		actual.num = 456;
		actual.num = 789;
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(impulse.mock.calls).toEqual([[]]);
	});

	it('prevents nested executions', async () => {
		const childImpulse = jest.fn();
		const childFiber = Object.assign([childImpulse], { registry: new Set() });
		queue.add(fiber);
		impulse.queued = true;
		impulse.mockImplementation(() => childImpulse.queued = false);
		const actual = createState({ str: 'abc' });
		fibers.unshift(childFiber);
		actual.str;
		fibers.shift();
		actual.str = 'xyz';
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(impulse.mock.calls).toEqual([[]]);
		expect(childImpulse).not.toHaveBeenCalled();
	});
});
