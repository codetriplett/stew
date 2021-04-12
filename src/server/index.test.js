import { server as $ } from '.';

describe('server', () => {
	it('renders singleton tag', () => {
		const actual = $('img', {}, []);
		expect(actual).toEqual('<img>');
	});

	it('renders container tag', () => {
		const actual = $('div', {}, []);
		expect(actual).toEqual('<div></div>');
	});

	it('renders content', () => {
		const actual = $('div', {}, ['(', [$('img', {})], ')']);
		expect(actual).toEqual('<div>(<img>)</div>');
	});

	it('ignores effect functions', () => {
		const actual = $('div', {}, ['(', () => {}, ')']);
		expect(actual).toEqual('<div>()</div>');
	});

	it('renders component', () => {
		function component ({ string }) { return ['(', string, ')']; }
		const actual = $(component, { string: 'abc' });
		expect(actual).toEqual('(abc)');
	});

	it('renders text', () => {
		const actual = $('abc');
		expect(actual).toEqual('abc');
	});

	it('renders fragment', () => {
		const actual = $('', {}, 'child');
		expect(actual).toEqual('child');
	});
});
