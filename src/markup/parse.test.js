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
		format.mockReturnValue({ '': [undefined, undefined, 'tag'] });

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
});
