import { trigger } from '../manage';
import { transform } from './transform';
import { update } from './update';

jest.mock('../manage');
jest.mock('./update');

describe('update-ctx', () => {
	const type = jest.fn();
	const render = jest.fn();
	const state = {};
	let memory, direct;

	beforeEach(() => {
		jest.clearAllMocks();
		render.mockReturnValue('simple child');
		update.mockReturnValue(render);

		type.mockImplementation((props, callback) => {
			const child = callback('elm', direct, 0);
			return ['child', child];
		});

		direct = { '': [[]] };
		memory = { '': [, { '': state }, type] };
	});

	it('fills in memory', () => {
		const actual = transform(memory, { key: 'value' }, 'content');

		expect(type).toHaveBeenCalledWith({ '': state, key: 'value' }, expect.any(Function));
		expect(update).toHaveBeenCalledWith('', {}, 'content');
		expect(memory[''][0]).toEqual([]);
		expect(actual).toEqual(['child', 'simple child']);
	});

	it('forces result into an array', () => {
		type.mockReturnValue('single child');
		const actual = transform(memory, { key: 'value' });
		expect(actual).toEqual(['single child']);
	});

	it('uses empty array for empty results', () => {
		type.mockReturnValue(undefined);
		const actual = transform(memory, { key: 'value' });
		expect(actual).toEqual([]);
	});

	it('updates if props have changed', () => {
		memory[''][0] = transform(memory, { key: 'value' }, 'previous content');
		memory.key = 'value';
		jest.clearAllMocks();
		type.mockReturnValue(['new child']);
		const shortcut = jest.spyOn(memory[''], 3);
		const actual = transform(memory, { key: 'new value' }, 'content');

		expect(type).toHaveBeenCalledWith({ '': state, key: 'new value' }, expect.any(Function));
		expect(shortcut).not.toHaveBeenCalled();
		expect(actual).toEqual(['new child']);
	});

	it('does not upate if props have not changed', () => {
		memory[''][0] = transform(memory, { key: 'value' }, 'previous content');
		memory.key = 'value';
		jest.clearAllMocks();
		const shortcut = jest.spyOn(memory[''], 3);
		const actual = transform(memory, { key: 'value' }, 'content');

		expect(type).not.toHaveBeenCalled();
		expect(shortcut).toHaveBeenCalledWith('content');
		expect(trigger).toHaveBeenCalledWith(direct, 'elm');
		expect(actual).toEqual(['child', 'simple child']);
	});
});
