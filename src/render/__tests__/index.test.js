import $, { updateText, updateAttribute } from './helper';
import { render } from '..';

describe('render', () => {
	describe('server', () => {
		it('text', () => {
			const actual = render(['abc']);
			expect(actual).toBe('abc');
		});

		it('leaf element', () => {
			const actual = render(['abc', { string: 'xyz', boolean: true }]);
			expect(actual).toBe('<abc string="xyz" true>');
		});

		it('container element', () => {
			const actual = render(['abc', {}, [[123], ['xyz', {}], [789]]]);
			expect(actual).toBe('<abc>123<xyz>789</abc>');
		});
	});

	describe('client', () => {
		beforeEach(() => {
			updateText.mockClear();
			updateAttribute.mockClear();
		});

		it('update text', () => {
			render(['xyz'], $('abc'));
			expect(updateText).toHaveBeenCalledWith('xyz');
		});

		it('keep text', () => {
			render(['abc'], $('abc'));
			expect(updateText).not.toHaveBeenCalled();
		});

		it('modifies attributes', () => {
			render(['abc', { string: 'xyz' }], $('abc', {}));
			expect(updateAttribute).toHaveBeenCalledWith('set', 'string', 'xyz');
		});

		it('returns previous sibling of text', () => {
			const actual = render(['abc'], $('abc'));
			expect(actual).toEqual('previous');
		});

		it('returns previous sibling of element', () => {
			const actual = render(['abc', {}], $('abc', {}));
			expect(actual).toEqual('previous');
		});
	});
});
