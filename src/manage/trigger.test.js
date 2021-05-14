import { queue, trigger } from '.';
import { transform } from '../memory';
import { locate } from './locate';
import { reconcile } from './reconcile';

jest.mock('../memory');
jest.mock('./locate');
jest.mock('./reconcile');
jest.useFakeTimers();

describe('trigger', () => {
	const callback = jest.fn();
	let children, memory, elm;

	beforeEach(() => {
		jest.clearAllMocks();
		callback.mockReturnValue(1);
		transform.mockReturnValue(['child']);
		locate.mockReturnValue('sibling');
		queue.splice(0);
		memory = { '': [[], { '': { '': callback } }] };
		elm = { '': [children = [memory, 'second', 'third']] };
	});

	it('sets up first trigger for a depth in queue', () => {
		trigger(memory, elm);

		expect(queue).toHaveLength(2);
		expect(queue[1].has(memory)).toEqual(true);

		jest.runAllTimers();

		expect(transform).toHaveBeenCalledWith(memory);
		expect(locate).toHaveBeenCalledWith(['second', 'third']);
		expect(reconcile).toHaveBeenCalledWith(memory, ['child'], {}, elm, memory, 'sibling');
	});

	it('ignores second time a ctx is triggered', () => {
		const has = jest.fn().mockImplementation(it => it === memory);
		const set = jest.fn();
		queue[1] = { has, set };
		trigger(memory, elm);

		expect(has).toHaveBeenCalledWith(memory);
		expect(set).not.toHaveBeenCalled();
	});
});
