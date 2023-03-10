import observe, { queue } from './observe';
import execute, { impulses } from './execute';

jest.mock('./execute');

describe('observe', () => {
	const callback = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		impulses.splice(0);
		impulses.unshift(callback);
	});

	it('reacts to changes to read properties', async () => {
		const actual = observe({ str: 'abc' });
		const before = actual.str;
		expect(before).toEqual('abc');
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(execute).not.toHaveBeenCalled();
		actual.str = 'xyz';
		expect(queue).toEqual(new Set([callback]));
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(execute).toHaveBeenCalledWith(callback);
		const after = actual.str;
		expect(after).toEqual('xyz');
	});
	
	it('prevents duplicate executions', async () => {
		const actual = observe({ str: 'abc', num: 123 });
		actual.str;
		actual.str;
		actual.num;
		actual.num;
		actual.str = 'lmno';
		actual.str = 'xyz';
		actual.num = 456;
		actual.num = 789;
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(execute.mock.calls).toEqual([[callback]]);
	});
	
	it('prevents nested executions', async () => {
		const parentImpulse = jest.fn();
		callback.parentImpulse = parentImpulse;
		queue.add(parentImpulse);
		const actual = observe({ str: 'abc' });
		actual.str;
		actual.str = 'xyz';
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(execute.mock.calls).toEqual([[parentImpulse]]);
	});
});
