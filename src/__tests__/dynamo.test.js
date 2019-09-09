import { evaluate } from '../evaluate';
import { render } from '../render';
import { dynamo } from '../dynamo';

jest.mock('../evaluate', () => ({ evaluate: jest.fn() }));
jest.mock('../render', () => ({ render: jest.fn() }));

function check (resolve, variations, ...inputs) {
	const alternative = resolve === evaluate ? render : evaluate;
	const state = {};

	for (const name in variations) {
		it(name, () => {
			const [expression, ...calls] = variations[name];
			const actual = dynamo(expression, state, ...inputs);
			const expected = calls.pop();

			expect(resolve.mock.calls).toEqual(calls.map(([
				item,
				...parameters
			]) => {
				parameters.push(...inputs.slice(parameters.length));
				return [item, state, ...parameters];
			}));

			expect(alternative).not.toHaveBeenCalled();
			expect(actual).toEqual(expected);
		});
	}
}

describe('dynamo', () => {
	beforeEach(() => {
		evaluate.mockClear().mockImplementation(([key]) => {
			return typeof key === 'string' ? `(${key})` : key;
		});

		render.mockClear().mockImplementation(item => {
			return Array.isArray(item) ? `[${item[0]}]` : `<${item['']}>`;
		});
	});

	describe('evaluate', () => {
		check(evaluate, {
			'static': [['a'], ['a']],
			'dynamic': [[['a']], [['a']], ['(a)']],
			'match': [[[true]], [[true]], []],
			'mismatch': [[[false]], [[false]], false],
			'static static': [['a', 'b'], ['a', 'b']],
			'static dynamic': [['a', ['b']], [['b']], ['a', '(b)']],
			'static match': [['a', [true]], [[true]], ['a']],
			'static mismatch': [['a', [false]], [[false]], false],
			'dynamic static': [[['a'], 'b'], [['a']], ['(a)', 'b']],
			'dynamic dynamic': [
				[['a'], ['c']],
				[['c']],
				[['a']],
				['(a)', '(c)']
			],
			'dynamic match': [[['a'], [true]], [[true]], [['a']], ['(a)']],
			'dynamic mismatch': [[['a'], [false]], [[false]], false],
			'match static': [[[true], 'b'], [[true]], ['b']],
			'match dynamic': [[[true], ['b']], [['b']], [[true]], ['(b)']],
			'match match': [[[true], [true]], [[true]], [[true]], []],
			'match mismatch': [[[true], [false]], [[false]], false],
			'mismatch static': [[[false], 'b'], [[false]], ['']],
			'mismatch dynamic': [
				[[false], ['b']],
				[['b']],
				[[false]],
				['']
			],
			'mismatch match': [
				[[false], [true]],
				[[true]],
				[[false]],
				false
			],
			'mismatch mismatch': [[[false], [false]], [[false]], false]
		}, {});
	});

	describe('generate', () => {
		check(render, {
			'expression': [[['a']], [['a'], 0], ['[a]']],
			'element': [[{ '': 'a' }], [{ '': 'a' }, 0], ['<a>']],
			'expression expression': [
				[['a'], ['b']],
				[['b'], 1],
				[['a'], 0],
				['[a]', '[b]']
			],
			'expression element': [
				[['a'], { '': 'b' }],
				[{ '': 'b' }, 1],
				[['a'], 0],
				['[a]', '<b>']
			],
			'element expression': [
				[{ '': 'a' }, ['b']],
				[['b'], 1],
				[{ '': 'a' }, 0],
				['<a>', '[b]']
			],
			'element element': [
				[{ '': 'a' }, { '': 'b' }],
				[{ '': 'b' }, 1],
				[{ '': 'a' }, 0],
				['<a>', '<b>']
			]
		}, 0, {});
	});

	describe('update', () => {
		const nodes = [
			{ getAttribute: () => null },
			{ getAttribute: () => '2' },
			{ getAttribute: () => null },
			{ getAttribute: () => '3-0' },
			{ getAttribute: () => '3-1' },
			{ getAttribute: () => null }
		];

		const update = () => {};

		nodes.forEach((node, i) => Object.assign(node, {
			nextSibling: nodes[i + 1] || null
		}));

		check(render, {
			'expression': [
				[['a']],
				[['a'], 0, nodes.slice(0, 1)],
				['[a]']
			],
			'element': [
				[{ '': 'a' }],
				[{ '': 'a' }, 0, nodes.slice(0, 1)],
				['<a>']
			],
			'expression expression': [
				[['a'], ['b']],
				[['b'], 1, []],
				[['a'], 0, nodes.slice(0, 1)],
				['[a]', '[b]']
			],
			'expression element': [
				[['a'], { '': 'b' }],
				[{ '': 'b' }, 1, []],
				[['a'], 0, nodes.slice(0, 1)],
				['[a]', '<b>']
			],
			'element expression': [
				[{ '': 'a' }, ['b']],
				[['b'], 1, []],
				[{ '': 'a' }, 0, nodes.slice(0, 1)],
				['<a>', '[b]']
			],
			'element element': [
				[{ '': 'a' }, { '': 'b' }],
				[{ '': 'b' }, 1, []],
				[{ '': 'a' }, 0, nodes.slice(0, 1)],
				['<a>', '<b>']
			]
		}, 0, nodes[0], update);

		check(render, {
			'skip missing': [
				[['a']],
				[['a'], 1, []],
				['[a]']
			]
		}, 1, nodes[1], update);

		check(render, {
			'update after skip': [
				[['a']],
				[['a'], 2, nodes.slice(1, 2)],
				['[a]']
			]
		}, 2, nodes[1], update);
		
		check(render, {
			'update loop': [
				[['a']],
				[['a'], 3, nodes.slice(3, 5)],
				['[a]']
			]
		}, 3, nodes[3], update);
		
		check(render, {
			'skip at end': [
				[['a'], ['b']],
				[['b'], 6, null],
				[['a'], 5, nodes.slice(5, 6)],
				['[a]', '[b]']
			]
		}, 5, nodes[5], update);
	});
});
