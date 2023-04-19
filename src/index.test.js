import stew from '.';
import createState, { onRender } from './state';
import testStructure from './test';

describe('stew', () => {
	it('renders fragment', () => {
		const actual = stew('', ['div'], []);
		expect(String(actual)).toEqual('<div></div>');
	});

	it('renders dynamic content', async () => {
		const state = createState({ expanded: false });

		const actual = stew('', () => ['', null,
			['button', {
				type: 'button',
				onclick: () => state.expanded = !state.expanded,
			}, state.expanded ? 'Collapse' : 'Expand'],
			state.expanded ? ['p', {}, 'Hello World!'] : null,
		], []);

		const button = actual.querySelector('button');
		expect(String(actual)).toEqual('<button type="button">Expand</button>');
		button.onclick();
		testStructure();
		await onRender();
		expect(String(actual)).toEqual('<button type="button">Collapse</button><p>Hello World!</p>');
		testStructure([true, [true]], [true, [true, [true, [true]], [false, []]]]);
	});

	it('allows state updates in effect', async () => {
		const state = createState({ initialized: false });

		const actual = stew('', () => {
			onRender(() => state.initialized = true);
			return ['p', {}, state.initialized ? 'After' : 'Before'];
		}, []);

		expect(String(actual)).toEqual('<p>Before</p>');
		testStructure();
		await onRender();
		expect(String(actual)).toEqual('<p>After</p>');
		testStructure([true, [true]], [true, [true, [true]]]);
	});

	it('uses memo to avoid duplicate effect', async () => {
		const effect = jest.fn();
		const state = createState({ initialized: false });

		const actual = stew('', (s, memos) => {
			if (!memos.length) {
				onRender(() => {
					effect();
					memos[0] = state.initialized = true;
				});
			}

			return ['p', {}, state.initialized ? 'After' : 'Before'];
		}, []);

		expect(String(actual)).toEqual('<p>Before</p>');
		testStructure();
		await onRender();
		expect(String(actual)).toEqual('<p>After</p>');
		testStructure([true, [true]], [true, [true, [true]]]);
		expect(effect.mock.calls).toEqual([[]]);
	});

	it('locates next sibling across dynamic content', async () => {
		const state = createState({ iteration: 1 });

		const actual = stew('', ['', null,
			'(',
			() => state.iteration % 2 === 0 ? 'fizz' : undefined,
			() => state.iteration % 3 === 0 ? 'buzz' : undefined,
			')'
		], []);

		expect(String(actual)).toEqual('()');
		testStructure();
		state.iteration++;
		await onRender();
		expect(String(actual)).toEqual('(fizz)');
		testStructure([true, [true], [true]], [true, [true, [true], [false], [false], [true]]]);
		state.iteration++;
		await onRender();
		expect(String(actual)).toEqual('(buzz)');
		testStructure([true, [true], [true]], [true, [true, [true], [false], [false], [true]]]);
		state.iteration++;
		await onRender();
		expect(String(actual)).toEqual('(fizz)');
		testStructure([true, [true], [true]], [true, [true, [true], [false], [false], [true]]]);
		state.iteration++;
		await onRender();
		expect(String(actual)).toEqual('()');
		testStructure([true, [true], [true]], [true, [true, [true], [false], [false], [true]]]);
		state.iteration++;
		await onRender();
		expect(String(actual)).toEqual('(fizzbuzz)');
		testStructure([true, [true], [true]], [true, [true, [true], [false], [false], [true]]]);
	});
});
