import { escape } from './escape';

describe('escape', () => {
	it('escapes characters', () => {
		const actual = escape(' & " \' < > ');
		expect(actual).toEqual(' &amp; &quot; &#39; &lt; &gt; ');
	});

	it('casts number to string', () => {
		const actual = escape(123);
		expect(actual).toEqual('123');
	});
});
