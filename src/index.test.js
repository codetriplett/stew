import { useState, useEffect } from './state/hooks';
import testStructure from './test';
import stew from '.';

describe('stew', () => {
	it('renders fragment', () => {
		const actual = stew('', ['div'], []);
		expect(String(actual)).toEqual('<div></div>');
	});

	it('renders dynamic content', async () => {
		const state = useState({ expanded: false });

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
		await useEffect();
		expect(String(actual)).toEqual('<button type="button">Collapse</button><p>Hello World!</p>');
		testStructure([true, [true]], [true, [true, [true, [true]], [false, []]]]);
	});

	it('allows state updates in effect', async () => {
		const state = useState({ initialized: false });

		const actual = stew('', () => {
			useEffect(() => state.initialized = true, []);
			return ['p', {}, state.initialized ? 'After' : 'Before'];
		}, []);

		expect(String(actual)).toEqual('<p>Before</p>');
		testStructure();
		await useEffect();
		expect(String(actual)).toEqual('<p>After</p>');
		testStructure([true, [true]], [true, [true, [true]]]);
	});

	it('locates next sibling across dynamic content', async () => {
		const state = useState({ iteration: 1 });

		const actual = stew('', ['', null,
			'(',
			() => state.iteration % 2 === 0 ? 'fizz' : undefined,
			() => state.iteration % 3 === 0 ? 'buzz' : undefined,
			')'
		], []);

		expect(String(actual)).toEqual('()');
		testStructure();
		state.iteration++;
		await useEffect();
		expect(String(actual)).toEqual('(fizz)');
		testStructure([true, [true], [true]], [true, [true, [true], [false], [false], [true]]]);
		state.iteration++;
		await useEffect();
		expect(String(actual)).toEqual('(buzz)');
		testStructure([true, [true], [true]], [true, [true, [true], [false], [false], [true]]]);
		state.iteration++;
		await useEffect();
		expect(String(actual)).toEqual('(fizz)');
		testStructure([true, [true], [true]], [true, [true, [true], [false], [false], [true]]]);
		state.iteration++;
		await useEffect();
		expect(String(actual)).toEqual('()');
		testStructure([true, [true], [true]], [true, [true, [true], [false], [false], [true]]]);
		state.iteration++;
		await useEffect();
		expect(String(actual)).toEqual('(fizzbuzz)');
		testStructure([true, [true], [true]], [true, [true, [true], [false], [false], [true]]]);
	});
});
