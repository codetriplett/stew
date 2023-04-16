import { useState, useEffect } from './state/hooks';
import stew from '.';

stew.isServer = false;

describe('stew', () => {
	it('renders fragment', () => {
		const actual = stew('', ['div'], []);
		expect(String(actual)).toEqual('<div></div>');
	});

	it('renders dynamic content', async () => {
		const state = useState({ expanded: false });

		const actual = stew('', () => ['button', {
			type: 'button',
			onclick: () => state.expanded = !state.expanded,
		}, state.expanded ? 'Collapse' : 'Expand'], []);

		const button = actual.querySelector('button');
		expect(String(actual)).toEqual('<button type="button">Expand</button>');
		button.onclick();
		await useEffect();
		expect(String(actual)).toEqual('<button type="button">Collapse</button>');
	});

	it('allows state updates in effect', async () => {
		const state = useState({ initialized: false });

		const actual = stew('', () => {
			useEffect(() => state.initialized = true, []);
			return ['p', {}, state.initialized ? 'After' : 'Before'];
		}, []);

		expect(String(actual)).toEqual('<p>Before</p>');
		await useEffect();
		expect(String(actual)).toEqual('<p>After</p>');
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
		state.iteration++;
		await useEffect();
		expect(String(actual)).toEqual('(fizz)');
		state.iteration++;
		await useEffect();
		expect(String(actual)).toEqual('(buzz)');
		state.iteration++;
		await useEffect();
		expect(String(actual)).toEqual('(fizz)');
		state.iteration++;
		await useEffect();
		expect(String(actual)).toEqual('()');
		state.iteration++;
		await useEffect();
		expect(String(actual)).toEqual('(fizzbuzz)');
	});
});
