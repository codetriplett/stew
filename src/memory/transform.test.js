import { queue } from '../manage';
import { transform } from './transform';

jest.mock('../manage');

describe('transform', () => {
	const tag = jest.fn();
	const callback = jest.fn();
	let state, memory;

	beforeEach(() => {
		jest.clearAllMocks();
		tag.mockImplementation((props, content) => ['child', content]);
		state = { '': callback };
		memory = { '': [[], { '': state }, tag, []] };
	});

	it('fills in memory', () => {
		const actual = transform(memory, { key: 'value' }, ['content']);

		expect(tag).toHaveBeenCalledWith({ '': state, key: 'value' }, ['content']);
		expect(memory[''][0]).toEqual([]);
		expect(actual).toEqual(['child', ['content']]);
	});

	it('forces result into an array', () => {
		tag.mockReturnValue('single child');
		const actual = transform(memory, { key: 'value' }, []);
		expect(actual).toEqual(['single child']);
	});

	it('uses empty array for empty results', () => {
		tag.mockReturnValue(undefined);
		const actual = transform(memory, { key: 'value' }, []);
		expect(actual).toEqual([]);
	});

	it('updates if props have changed', () => {
		memory[''][0] = transform(memory, { key: 'value' }, ['content']);
		jest.clearAllMocks();
		tag.mockReturnValue(['new child']);
		const actual = transform(memory, { key: 'new value' }, ['content']);

		expect(tag).toHaveBeenCalledWith({ '': state, key: 'new value' }, ['content']);
		expect(actual).toEqual(['new child']);
	});

	it('updates if content has changed', () => {
		memory[''][0] = transform(memory, { key: 'value' }, ['content']);
		jest.clearAllMocks();
		tag.mockReturnValue(['new child']);
		const actual = transform(memory, { key: 'value' }, ['new content']);

		expect(tag).toHaveBeenCalledWith({ '': state, key: 'value' }, ['new content']);
		expect(actual).toEqual(['new child']);
	});

	it('does not upate if props have not changed', () => {
		memory[''][0] = transform(memory, { key: 'value' }, ['content']);
		jest.clearAllMocks();
		const actual = transform(memory, { key: 'value' }, ['content']);

		expect(tag).not.toHaveBeenCalled();
		expect(actual).toEqual(undefined);
	});

	it('does not compare props and content at first', () => {
		memory[''][3] = undefined;
		const actual = transform(memory, { key: 'value' }, ['content']);

		expect(tag).toHaveBeenCalledWith({ '': state, key: 'value' }, ['content']);
		expect(actual).toEqual(['child', ['content']]);
	});

	it('does not compare props when none are provided', () => {
		memory[''][3] = ['content'];
		Object.assign(memory, { key: 'value' });
		const actual = transform(memory);

		expect(tag).toHaveBeenCalledWith({ '': state, key: 'value' }, ['content']);
		expect(actual).toEqual(['child', ['content']]);
	});

	it('removes itself from the queue', () => {
		callback.mockReturnValue(1);
		queue[1] = new Map().set(memory, () => {});
		const actual = transform(memory, { key: 'value' }, ['content']);

		expect(queue[1].has(memory)).toEqual(false);
	});
});
