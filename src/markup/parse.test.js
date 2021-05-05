import { parse } from './parse';
import { format } from './format';

jest.mock('./format');

describe('parse', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		format.mockImplementation(([first]) => {
			if (first.startsWith('/')) return;
			return { '': [[], undefined, 'tag'] };
		});
	});

	it('should add correct spacing', () => {
		const actual = parse`
			abc
			lm no
			xyz
		`;

		expect(actual).toEqual(['abc lm no xyz']);
	});

	it('should include variables', () => {
		const actual = parse`
			abc
			${0}
			xyz
		`;

		expect(actual).toEqual(['abc', 0, 'xyz']);
	});

	it('should process singleton tags', () => {
		const actual = parse`
			<img
				before alt= after
				src="http://domain.com/image.jpg"
			>
		`;

		expect(format).toHaveBeenCalledWith([
			'img before alt= after src="http://domain.com/image.jpg"'
		]);

		expect(actual).toEqual([
			{ '': [[], undefined, 'tag'] }
		]);
	});

	it('should process container tags', () => {
		const actual = parse`
			<div>
				<img src="http://domain.com/image.jpg">
			</>
		`;

		expect(format.mock.calls).toEqual([
			[['div']],
			[['img src="http://domain.com/image.jpg"']],
			[['/']]
		]);

		expect(actual).toEqual([
			{
				'': [
					[
						{ '': [[], undefined, 'tag'] }
					],
					undefined,
					'tag'
				]
			}
		]);
	});

	it('should process self closing tags', () => {
		format.mockReturnValueOnce({ '': [undefined, undefined, 'tag'] });

		const actual = parse`
			abc
			<div />
			xyz
		`;

		expect(format.mock.calls).toEqual([
			[['div /']]
		]);

		expect(actual).toEqual([
			'abc',
			{ '': [[], undefined, 'tag'] },
			'xyz'
		]);
	});
	
	it('should process custom fragment tag', () => {
		format.mockReturnValueOnce({ '': [[], undefined, '', []] });

		const html = `
			<div>
				<img src="http://domain.com/image.jpg">
			</>
		`;

		const actual = parse`
			<>
				abc
				${html}
				xyz
			</>
		`;

		expect(format.mock.calls).toEqual([
			[['']],
			[['/']]
		]);

		expect(actual).toEqual([
			{
				'': [
					[],
					undefined,
					'',
					[
						'abc',
						html,
						'xyz'
					]
				]
			}
		]);
	});
	
	it('should process custom fragment child', () => {
		format.mockReturnValueOnce({ '': [[], undefined, 'img'] });
		const actual = parse('abc<img>xyz');

		expect(format.mock.calls).toEqual([
			[['img']]
		]);

		expect(actual).toEqual([
			'abc',
			{
				'': [
					[],
					undefined,
					'img'
				]
			},
			'xyz'
		]);
	});
	
	it('should sanitize custom fragment child', () => {
		format
			.mockReturnValueOnce({ '': [[], undefined, 'style'] })
			.mockReturnValueOnce(undefined)
			.mockReturnValueOnce({ '': [[], undefined, 'script'] })
			.mockReturnValueOnce(undefined)
			.mockReturnValueOnce({ '': [[], undefined, 'script'], src: '/exploit.js' })
			.mockReturnValueOnce(undefined)
			.mockReturnValueOnce({ '': [[], undefined, 'a'], href: 'javascript:alert(\'hacked?\');' })
			.mockReturnValueOnce(undefined)
			.mockReturnValueOnce({ '': [[], undefined, 'a'], href: '/' })
			.mockReturnValueOnce(undefined)

		const actual = parse(`
			abc
			<style>* { color: transparent; }</style>
			<script>alert('hacked!');</script>
			<script src="/exploit.js"></script>
			<a href="javascript:alert('hacked?');">Click me</a>
			<a href="/">Go home</a>
			xyz
		`);

		expect(format.mock.calls).toEqual([
			[['style']],
			[['/style']],
			[['script']],
			[['/script']],
			[['script src="/exploit.js"']],
			[['/script']],
			[['a href="javascript:alert(\'hacked?\');"']],
			[['/a']],
			[['a href="/"']],
			[['/a']]
		]);

		expect(actual).toEqual([
			'abc',
			{ '': [['Go home'], undefined, 'a'], href: '/' },
			'xyz'
		]);
	});
});
