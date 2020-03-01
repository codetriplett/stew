import $, { updateAttribute } from './helper';
import { modify } from '../modify';

describe('modify', () => {
	describe('server', () => {
		it('sets strings', () => {
			const actual = modify(['string', 'abc']);
			expect(actual).toBe(' string="abc"');
		});

		it('sets boolean', () => {
			const actual = modify(['boolean', true]);
			expect(actual).toBe(' true');
		});

		it('sets id', () => {
			const actual = modify(['', 'abc']);
			expect(actual).toBe(' data--="abc"');
		});

		it('does not set boolean', () => {
			const actual = modify(['boolean', false]);
			expect(actual).toBe('');
		});

		it('does not set function', () => {
			const actual = modify(['onclick', () => {}]);
			expect(actual).toBe('');
		});
	});

	describe('client', () => {
		beforeEach(() => {
			updateAttribute.mockClear();
		});

		it('sets string', () => {
			modify(['string', 'xyz'], $('div', { string: 'abc' }));
			expect(updateAttribute).toHaveBeenCalledWith('set', 'string', 'xyz');
		});

		it('keeps string', () => {
			modify(['string', 'abc'], $('div', { string: 'abc' }));
			expect(updateAttribute).not.toHaveBeenCalled();
		});

		it('toggles boolean', () => {
			modify(['boolean', true], $('div', {}));
			expect(updateAttribute).toHaveBeenCalledWith('toggle', 'boolean', true);
		});

		it('keeps boolean', () => {
			modify(['boolean', true], $('div', { boolean: '' }));
			expect(updateAttribute).not.toHaveBeenCalled();
		});

		it('removes boolean', () => {
			modify(['boolean', false], $('div', { boolean: '' }));
			expect(updateAttribute).toHaveBeenCalledWith('remove', 'boolean');
		});

		it('keeps boolean unset', () => {
			modify(['boolean', false], $('div', {}));
			expect(updateAttribute).not.toHaveBeenCalled();
		});

		it('sets function', () => {
			const fn = () => {};
			modify(['onclick', fn], $('div', {}));

			expect(updateAttribute.mock.calls).toEqual([
				['listen', 'click', fn],
				['set', 'onclick', 'javascript:void(0);']
			]);
		});

		it('keeps function', () => {
			const fn = () => {};
			modify(['onclick', fn], $('div', { onclick: 'javascript:void(0);' }));
			expect(updateAttribute).not.toHaveBeenCalled();
		});
	});
});
