import { updateCtx } from './update-ctx';
import { client } from '../client';
import { trigger } from '../manage';

jest.mock('../client');
jest.mock('../manage');

describe('update-ctx', () => {
	const type = jest.fn();
	const state = jest.fn();
	const render = jest.fn();
	let memory, direct;

	beforeEach(() => {
		jest.clearAllMocks();
		render.mockReturnValue('simple child');
		client.mockReturnValue(render);

		type.mockImplementation((props, callback) => {
			const child = callback('elm', direct, 0);
			return ['child', child];
		});

		direct = { '': [[]] };
		memory = { '': [, { '': state }, type] };
	});

	it('fills in memory', () => {
		const actual = updateCtx(memory, { key: 'value' }, 'content');

		expect(type).toHaveBeenCalledWith({ '': state, key: 'value' }, expect.any(Function));
		expect(client).toHaveBeenCalledWith('', {}, 'content');
		expect(memory[''][0]).toEqual([]);
		expect(actual).toEqual(['child', 'simple child']);
	});

	it('forces result into an array', () => {
		type.mockReturnValue('single child');
		const actual = updateCtx(memory, { key: 'value' });
		expect(actual).toEqual(['single child']);
	});

	it('uses empty array for empty results', () => {
		type.mockReturnValue(undefined);
		const actual = updateCtx(memory, { key: 'value' });
		expect(actual).toEqual([]);
	});

	it('updates if props have changed', () => {
		memory[''][0] = updateCtx(memory, { key: 'value' }, 'previous content');
		memory.key = 'value';
		jest.clearAllMocks();
		type.mockReturnValue(['new child']);
		const shortcut = jest.spyOn(memory[''], 3);
		const actual = updateCtx(memory, { key: 'new value' }, 'content');

		expect(type).toHaveBeenCalledWith({ '': state, key: 'new value' }, expect.any(Function));
		expect(shortcut).not.toHaveBeenCalled();
		expect(actual).toEqual(['new child']);
	});

	it('does not upate if props have not changed', () => {
		memory[''][0] = updateCtx(memory, { key: 'value' }, 'previous content');
		memory.key = 'value';
		jest.clearAllMocks();
		const shortcut = jest.spyOn(memory[''], 3);
		const actual = updateCtx(memory, { key: 'value' }, 'content');

		expect(type).not.toHaveBeenCalled();
		expect(shortcut).toHaveBeenCalledWith('content');
		expect(trigger).toHaveBeenCalledWith(direct, 'elm');
		expect(actual).toEqual(['child', 'simple child']);
	});
});
