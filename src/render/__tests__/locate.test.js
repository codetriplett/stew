/**
 * @jest-environment jsdom
 */

import $, { updateNodes } from './helper';
import { locate } from '../locate';

describe('locate', () => {
	beforeEach(() => {
		updateNodes.mockClear();
	});

	it.only('returns static input element if it was expected', () => {
		const element = $('div', {});
		const actual = locate(['div', {}], { lastChild: element });

		expect(actual).toBe(element);
	});

	it('returns dynamic input element if it matches the id', () => {
		const element = $('div', { 'data--': '1' });
		const actual = locate(['div', { '': '1' }], element);

		expect(actual).toBe(element);
	});

	it('returns new element if it is the only child', () => {
		const element = { parentNode: $('div', { 'data--': '1' }).parentNode };
		const actual = locate(['div', { '': '2' }], element);
		const expected = document.createElement('div');

		expect(updateNodes).toHaveBeenCalledWith('append', expected);
		expect(actual).toEqual(expected);
	});

	it('returns new element if id is greater than input element', () => {
		const element = $('div', { 'data--': '1' });
		const actual = locate(['div', { '': '2' }], element);
		const expected = document.createElement('div');

		expect(updateNodes).toHaveBeenCalledWith('append', expected);
		expect(actual).toEqual(expected);
	});

	it('removes input element if it is greather than id', () => {
		const element = $('div', { 'data--': '2' });
		const actual = locate(['div', { '': '1' }], element);
		const expected = document.createElement('div');

		expect(updateNodes.mock.calls).toEqual([
			['remove', element],
			['append', expected]
		]);

		expect(actual).toEqual(expected);
	});
});
