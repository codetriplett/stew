import { frameworks, virtualFramework } from '.';
import { fibers } from './impulse';
import createState, { queue } from './state';

describe('createState', () => {
	const impulse = jest.fn();
	let fiber;

	beforeEach(() => {
		jest.clearAllMocks();
		fiber = Object.assign([impulse], { subscriptionsSet: new Set() });
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
		expect(queue).toEqual(new Set([impulse]));
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

	// test this after activate is tested
	it.skip('prevents nested executions', async () => {
		queue.add(parentImpulse);
		const actual = createState({ str: 'abc' });
		actual.str;
		const childImpulse = jest.fn();
		const childFIber = Object.assign([childImpulse], { subscriptionSet: new Set });
		childImpulse.fiber = childFiber;
		impulse.Fiber.push(childFiber);
		fibers.unshift(childImpulse);
		actual.str;
		fibers.shift();
		actual.str = 'xyz';
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(impulse.mock.calls).toEqual([[]]);
		expect(impulse).not.toHaveBeenCalled();
	});
});
