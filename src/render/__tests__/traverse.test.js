/**
 * @jest-environment jsdom
 */

import { traverse } from '../traverse';

describe('traverse', () => {
	let container;

	beforeEach(() => {
		container = document.createElement('div');
	});
	
	it('does not locate on server', () => {
		const actual = traverse([
			['abc'],
			['span', {}, [['123']]],
			['xyz']
		]);

		expect(actual).toEqual([
			'abc',
			'<span>123</span>',
			'xyz'
		]);
	});
	
	it.only('fills container element', () => {
		traverse([
			['abc'],
			['span', {}, [['123']]],
			['xyz']
		], container);

		expect(container.innerHTML).toBe([
			'abc',
			'<span>123</span>',
			'xyz'
		].join(''));
	});
	
	it('modifies existing elements', () => {
		container.innerHTML = [
			'abc',
			'<span>123</span>',
			'xyz'
		].join('');

		traverse([
			['xyz'],
			['span', {}, [['789']]],
			['abc']
		], container);

		expect(container.innerHTML).toBe([
			'xyz',
			'<span>789</span>',
			'abc'
		].join(''));
	});

	it('inserts new element', () => {
		container.innerHTML = [
			'<span>123</span>',
			'<span>789</span>',
		].join('');

		traverse([
			['span', {}, [['123']]],
			['span', { '': '1' }, [['abc']]],
			['span', {}, [['789']]],
		], container);

		expect(container.innerHTML).toBe([
			'<span>123</span>',
			'<span data--="1">abc</span>',
			'<span>789</span>',
		].join(''));
	});
	
	it('removes old element', () => {
		container.innerHTML = [
			'<span>123</span>',
			'<span data--="1">abc</span>',
			'<span>789</span>',
		].join('');

		traverse([
			['span', {}, [['123']]],
			['span', {}, [['789']]],
		], container);

		expect(container.innerHTML).toBe([
			'<span>123</span>',
			'<span>789</span>',
		].join(''));
	});
});
