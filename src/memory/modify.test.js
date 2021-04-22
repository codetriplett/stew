import { modify } from './modify';

describe('modify', () => {
	describe('txt', () => {
		let node, memory;

		beforeEach(() => {
			node = { nodeValue: '' };
			memory = { '': ['', node] };
		});

		it('updates text', () => {
			modify(memory, {}, 'abc');

			expect(node.nodeValue).toEqual('abc');
			expect(memory[''][0]).toEqual('abc');
		});

		it('keeps text', () => {
			memory[''][0] = node.nodeValue = 'abc';
			modify(memory, {}, 'abc');

			expect(node.nodeValue).toEqual('abc');
			expect(memory[''][0]).toEqual('abc');
		});

		it('clears text', () => {
			memory[''][0] = node.nodeValue = 'abc';
			modify(memory, {}, '');

			expect(node.nodeValue).toEqual('');
			expect(memory[''][0]).toEqual('');
		});
	});

	describe('elm', () => {
		const addEventListener = jest.fn();
		const removeEventListener = jest.fn();
		const removeAttribute = jest.fn();
		const setAttribute = jest.fn();
		const toggleAttribute = jest.fn();
		let node, memory;

		beforeEach(() => {
			jest.clearAllMocks();

			node = {
				style: {},
				addEventListener, removeEventListener,
				removeAttribute, setAttribute, toggleAttribute
			};

			memory = { '': [, node, 'div'] };
		});

		it('sets string', () => {
			modify(memory, { string: 'abc' });
			expect(setAttribute).toHaveBeenCalledWith('string', 'abc');
		});

		it('sets concatenated string', () => {
			modify(memory, { class: ['prefix', true, false, 'suffix'] });
			expect(setAttribute).toHaveBeenCalledWith('class', 'prefix suffix');
		});

		it('toggles true', () => {
			modify(memory, { true: true });
			expect(toggleAttribute).toHaveBeenCalledWith('true', true);
		});

		it('removes attribute', () => {
			memory.string = 'abc';
			modify(memory, {});
			expect(removeAttribute).toHaveBeenCalledWith('string');
		});

		it('adds listener', () => {
			const onclick = () => {};
			modify(memory, { onclick });
			expect(addEventListener).toHaveBeenCalledWith('click', onclick);
		});

		it('removes listener', () => {
			const onclick = memory.onclick = node.onclick = () => {};
			modify(memory, {});
			expect(removeEventListener).toHaveBeenCalledWith('click', onclick);
		});

		it('adds style', () => {
			modify(memory, { style: { string: 'abc' } });
			expect(node.style).toEqual({ string: 'abc' });
		});

		it('removes style', () => {
			memory.style = node.style = { string: 'abc', boolean: true };
			modify(memory, { style: { boolean: true } });
			expect(node.style).toEqual({ boolean: true });
		});
	});
});
