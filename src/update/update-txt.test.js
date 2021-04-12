import { updateTxt } from './update-txt';

describe('update-txt', () => {
	let node, memory;

	beforeEach(() => {
		node = { nodeValue: '' };
		memory = { '': ['', node] };
	});

	it('updates text', () => {
		updateTxt(memory, 'abc');

		expect(node.nodeValue).toEqual('abc');
		expect(memory[''][0]).toEqual('abc');
	});

	it('keeps text', () => {
		memory[''][0] = node.nodeValue = 'abc';
		updateTxt(memory, 'abc');

		expect(node.nodeValue).toEqual('abc');
		expect(memory[''][0]).toEqual('abc');
	});

	it('clears text', () => {
		memory[''][0] = node.nodeValue = 'abc';
		updateTxt(memory, '');

		expect(node.nodeValue).toEqual('');
		expect(memory[''][0]).toEqual('');
	});
});
