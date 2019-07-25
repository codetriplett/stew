import { stitch } from '../stitch';

describe('stitch', () => {
	it('should expand keys', () => {
		const actual = stitch({
			value: 'string',
			'object.value': 'object',
			'array.0.': 'first',
			'array.1.value': 'second'
		});

		expect(actual).toEqual({
			value: 'string',
			object: {
				value: 'object'
			},
			array: [
				'first',
				{
					value: 'second'
				}
			]
		});
	});

	it('should apply defaults to object', () => {
		const actual = stitch({
			keep: 'updates',
			ignore: 'updates',
			'depth.keep': 'updates',
			'depth.ignore': 'updates'
		}, {
			add: 'defaults',
			keep: 'defaults',
			depth: {
				add: 'defaults',
				keep: 'defaults'
			}
		});

		expect(actual).toEqual({
			add: 'defaults',
			keep: 'updates',
			ignore: 'updates',
			depth: {
				add: 'defaults',
				keep: 'updates',
				ignore: 'updates'
			}
		});
	});

	it('should apply defaults to array', () => {
		const actual = stitch({
			'array.0.keep': 'first',
			'array.0.ignore': 'first',
			'array.1.keep': 'second',
			'array.1.ignore': 'second'
		}, {
			array: {
				add: 'defaults',
				keep: 'defaults'
			}
		});

		expect(actual).toEqual({
			array: [
				{
					add: 'defaults',
					keep: 'first',
					ignore: 'first'
				},
				{
					add: 'defaults',
					keep: 'second',
					ignore: 'second'
				}
			]
		});
	});
});
