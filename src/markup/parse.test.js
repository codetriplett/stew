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
	
	it('should process static tag', () => {
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
	
	it('should process static child', () => {
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
	
	it('should sanitize static child', () => {
		format.mockReturnValueOnce({ '': [[], undefined, 'script'] });
		const actual = parse('abc<script>alert(\'hacked!\');</script>xyz');

		expect(format.mock.calls).toEqual([
			[['script']],
			[['/script']]
		]);

		expect(actual).toEqual([
			'abc',
			'xyz'
		]);
	});
});
