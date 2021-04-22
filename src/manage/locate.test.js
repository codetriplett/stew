import { locate } from './locate';

describe('locate', () => {
	let node, text, nodeMemory, textMemory;

	beforeEach(() => {
		nodeMemory = { '': [, node = document.createElement('div')] };
		textMemory = { '': [, text = document.createTextNode('abc')] };
	});

	it('finds node', () => {
		const actual = locate([, nodeMemory, textMemory,]);
		expect(actual).toEqual(node);
	});

	it('finds text', () => {
		const actual = locate([, textMemory, nodeMemory,]);
		expect(actual).toEqual(text);
	});

	it('finds nested node', () => {
		const actual = locate([, { '': [[nodeMemory, textMemory]] },]);
		expect(actual).toEqual(node);
	});
});
