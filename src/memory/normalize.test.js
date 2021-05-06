import { normalize } from './normalize';
import { parse } from '../markup';

jest.mock('../markup');

describe('normalize', () => {
	let params, prev, props;

	beforeEach(() => {
		jest.clearAllMocks();
		parse.mockReturnValue(['xyz']);
		params = ['abc'];
		prev = ['lmno'];
		props = { key: 'value' };
	});

	it('forces undefined for falsy value', () => {
		const actual = normalize('');
		expect(actual).toEqual(undefined);
	});

	it('forces undefined for boolean true', () => {
		const actual = normalize(true);
		expect(actual).toEqual(undefined);
	});

	it('forces undefined for boolean true', () => {
		const actual = normalize(true);
		expect(actual).toEqual(undefined);
	});

	it('create string outline', () => {
		const actual = normalize('abc');
		expect(actual).toEqual({ '': ['abc'] });
	});

	it('create string outline for zero', () => {
		const actual = normalize(0);
		expect(actual).toEqual({ '': ['0'] });
	});

	it('create array outline', () => {
		const actual = normalize(['lmno']);
		expect(actual).toEqual({ '': [['lmno'],, ''] });
	});

	it('return outline as is', () => {
		const actual = normalize({ '': [[],, 'div'], key: 'value' });
		expect(actual).toEqual({ '': [[],, 'div'], key: 'value' });
	});

	it('return non outline object as is', () => {
		const actual = normalize({ key: 'value' });
		expect(actual).toEqual({ key: 'value' });
	});

	it('parses html for custom fragment', () => {
		const actual = normalize('abc', params);
		expect(parse).toHaveBeenCalledWith('abc');
		expect(actual).toEqual({ '': [['xyz'],, ''] });
	});

	it('skips parse when not needed', () => {
		const actual = normalize('abc', params, 0, ['lmno']);
		expect(parse).not.toHaveBeenCalled();
		expect(actual).toEqual({ '': [['lmno'],, ''] });
	});

	it('parses html if input changes', () => {
		const actual = normalize('xyz', params, 0, ['lmno']);
		expect(parse).toHaveBeenCalledWith('xyz');
		expect(actual).toEqual({ '': [['xyz'],, ''] });
	});

	describe('function', () => {
		const callback = jest.fn();

		beforeEach(() => {
			callback.mockReturnValue('lmno');
		});

		it('custom fragment on server', () => {
			const actual = normalize(callback, params);
			expect(callback).toHaveBeenCalledWith();
			expect(actual).toEqual({ '': [['xyz'],, ''] });
		});

		it('does not accept teardown result', () => {
			const teardown = () => {};
			callback.mockReturnValue(teardown);
			const actual = normalize(callback, params);
			expect(callback).toHaveBeenCalledWith();
			expect(actual).toEqual(undefined);
		});

		it('custom fragment on client', () => {
			const actual = normalize(callback, params, 0, prev, props);
			expect(callback).toHaveBeenCalledWith({ '': prev, key: 'value' });
			expect(actual).toEqual({ '': [['xyz'],, ''] });
		});

		it('first effect on client', () => {
			const actual = normalize(callback, undefined, 0, undefined);
			expect(callback).toHaveBeenCalledWith();
			expect(actual).toEqual(undefined);
		});

		it('accepts teardown result', () => {
			const teardown = () => {};
			callback.mockReturnValue(teardown);
			const actual = normalize(callback, undefined, 0, undefined);
			expect(callback).toHaveBeenCalledWith();
			expect(actual).toEqual(teardown);
		});

		it('subsequent effect on client', () => {
			const actual = normalize(callback, undefined, 0, ['abc'], props);
			expect(callback).toHaveBeenCalledWith({ '': ['abc'], key: 'value' });
			expect(actual).toEqual(undefined);
		});
	});
});
