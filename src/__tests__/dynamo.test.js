import { evaluate } from '../evaluate';
import { render } from '../render';
import { dynamo } from '../dynamo';

jest.mock('../evaluate', () => ({ evaluate: jest.fn() }));
jest.mock('../render', () => ({ render: jest.fn() }));

function createContainer (...ids) {
	const childNodes = ids.map(id => ({ getAttribute: () => id }));

	childNodes.reduce((previousSibling, childNode) => {
		childNode.previousSibling = previousSibling;
		return childNode;
	}, null);
	
	return { childNodes };
}

function check (resolve, variations, ...inputs) {
	const alternative = resolve === evaluate ? render : evaluate;
	const callback = inputs.pop();
	const state = {};

	for (const name in variations) {
		const mode = it;

		if (name.startsWith('!')) {
			mode = it.skip;
		} else if (name.endsWith('!')) {
			mode = it.only;
		}

		mode(name.replace(/^!+|!+$/, ''), () => {
			const [expression, ...calls] = variations[name];
			const actual = dynamo(expression, state, ...inputs);
			const expected = calls.pop();

			expect(resolve.mock.calls).toEqual(calls.map(([
				item,
				...parameters
			]) => {
				parameters = callback(...inputs, ...parameters);
				return [item, state, ...parameters];
			}));

			expect(alternative).not.toHaveBeenCalled();
			expect(actual).toEqual(expected);
		});
	}
}

describe('dynamo', () => {
	beforeEach(() => {
		evaluate.mockClear().mockImplementation(([key, value = key]) => {
			return typeof value === 'string' ? `(${value})` : value;
		});

		render.mockClear().mockImplementation(item => {
			return Array.isArray(item) ? `[${item[0]}]` : `<${item['']}>`;
		});
	});

	describe.only('evaluate', () => {
		check(evaluate, {
			'static': [['a'], 'a'],
			'dynamic': [[['a']], [['a']], '(a)'],
			'match': [[['a', true]], [['a', true]], true],
			'mismatch': [[['a', false]], [['a', false]], false],
			'static static': [['a', 'b'], 'ab'],
			'static dynamic': [['a', ['b']], [['b']], 'a(b)'],
			'static match': [['a', ['b', true]], [['b', true]], 'a'],
			'static mismatch': [['a', ['b', false]], [['b', false]], false],
			'dynamic static': [[['a'], 'b'], [['a']], '(a)b'],
			'dynamic dynamic': [
				[['a'], ['c']],
				[['c']], [['a']],
				'(a)(c)'
			],
			'dynamic match': [
				[['a'], ['b', true]],
				[['b', true]], [['a']],
				'(a)'
			],
			'dynamic mismatch': [[['a'], ['b', false]], [['b', false]], false],
			'match static': [[['a', true], 'b'], [['a', true]], 'b'],
			'match dynamic': [
				[['a', true], ['b']],
				[['b']], [['a', true]],
				'(b)'
			],
			'match match': [
				[['a', true], ['b', true]],
				[['b', true]], [['a', true]],
				true
			],
			'match mismatch': [
				[['a', true], ['b', false]],
				[['b', false]],
				false
			],
			'mismatch static': [[['a', false], 'b'], [['a', false]], ''],
			'mismatch dynamic': [
				[['a', false], ['b']],
				[['b']], [['a', false]],
				''
			],
			'mismatch match': [
				[['a', false], ['b', true]],
				[['b', true]], [['a', false]],
				false
			],
			'mismatch mismatch': [
				[['a', false], ['b', false]],
				[['b', false]],
				false
			]
		}, () => [undefined]);
	});

	describe('hydrate', () => {
		check(evaluate, {
			'static': [['a'], 'a']
		}, 'a', (value, fragment) => [fragment, undefined]);
		
		check(evaluate, {
			'dynamic': [[['a']], [['a'], '(a)'], '(a)']
		}, '(a)', (value, fragment) => [fragment, undefined]);
		
		check(evaluate, {
			'match': [[[true]], [[true], ''], true]
		}, '', (value, fragment) => [fragment, undefined]);

		check(evaluate, {
			'static static': [['a', 'b'], 'ab']
		}, 'ab', (value, fragment) => [fragment, undefined]);
		
		check(evaluate, {
			'static dynamic': [['a', ['b']], [['b'], '(b)'], 'a(b)']
		}, 'a(b)', (value, fragment) => [fragment]);
		
		check(evaluate, {
			'static match': [['a', [true]], [[true], 'a'], 'a']
		}, 'a', (value, fragment) => [fragment, undefined]);
		
		check(evaluate, {
			'dynamic static': [[['a'], 'b'], [['a'], '(a)'], '(a)b']
		}, '(a)b', (value, fragment) => [fragment, undefined]);

		check(evaluate, {
			'dynamic dynamic': [
				[['a'], ['c']],
				[['c'], '(a)(c)'],
				[['a'], '(a)(c)'],
				'(a)(c)'
			]
		}, '(a)(c)', (value, fragment) => [fragment, undefined]);

		check(evaluate, {
			'dynamic match': [
				[['a'], [true]],
				[[true], '(a)'],
				[['a'], '(a)'],
				'(a)'
			]
		}, '(a)', (value, fragment) => [fragment, undefined]);
	});

	describe('generate', () => {
		check(render, {
			'expression': [[['a']], [['a'], 0], '[a]'],
			'element': [[{ '': 'a' }], [{ '': 'a' }, 0], '<a>'],
			'expression expression': [
				[['a'], ['b']],
				[['b'], 1],
				[['a'], 0],
				'[a][b]'
			],
			'expression element': [
				[['a'], { '': 'b' }],
				[{ '': 'b' }, 1],
				[['a'], 0],
				'[a]<b>'
			],
			'element expression': [
				[{ '': 'a' }, ['b']],
				[['b'], 1],
				[{ '': 'a' }, 0],
				'<a>[b]'
			],
			'element element': [
				[{ '': 'a' }, { '': 'b' }],
				[{ '': 'b' }, 1],
				[{ '': 'a' }, 0],
				'<a><b>'
			]
		}, {}, (backup, index) => [index, backup, undefined]);
	});

	describe('update', () => {
		const update = () => {};
		const container = createContainer(null, null);

		check(render, {
			'expression': [
				[['a']],
				[['a'], 0, container.childNodes.slice(1, 2)],
				'[a]'
			],
			'element': [
				[{ '': 'a' }],
				[{ '': 'a' }, 0, container.childNodes.slice(1, 2)],
				'<a>'
			],
			'expression expression': [
				[['a'], ['b']],
				[['b'], 1, container.childNodes.slice(1, 2)],
				[['a'], 0, container.childNodes.slice(0, 1)],
				'[a][b]'
			],
			'expression element': [
				[['a'], { '': 'b' }],
				[{ '': 'b' }, 1, container.childNodes.slice(1, 2)],
				[['a'], 0, container.childNodes.slice(0, 1)],
				'[a]<b>'
			],
			'element expression': [
				[{ '': 'a' }, ['b']],
				[['b'], 1, container.childNodes.slice(1, 2)],
				[{ '': 'a' }, 0, container.childNodes.slice(0, 1)],
				'<a>[b]'
			],
			'element element': [
				[{ '': 'a' }, { '': 'b' }],
				[{ '': 'b' }, 1, container.childNodes.slice(1, 2)],
				[{ '': 'a' }, 0, container.childNodes.slice(0, 1)],
				'<a><b>'
			]
		}, container, update, (container, update, index, nodes) => {
			return [index, nodes, update];
		});
	});
});
