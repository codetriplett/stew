import { updateElm } from './update-elm';

describe('update-elm', () => {
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

		memory = { '': [, node] };
	});

	it('sets string', () => {
		updateElm(memory, { string: 'abc' });
		expect(setAttribute).toHaveBeenCalledWith('string', 'abc');
	});

	it('sets concatenated string', () => {
		updateElm(memory, { class: ['prefix', true, false, 'suffix'] });
		expect(setAttribute).toHaveBeenCalledWith('class', 'prefix suffix');
	});

	it('toggles true', () => {
		updateElm(memory, { true: true });
		expect(toggleAttribute).toHaveBeenCalledWith('true', true);
	});

	it('removes attribute', () => {
		memory.string = 'abc';
		updateElm(memory, {});
		expect(removeAttribute).toHaveBeenCalledWith('string');
	});

	it('adds listener', () => {
		const onclick = () => {};
		updateElm(memory, { onclick });
		expect(addEventListener).toHaveBeenCalledWith('click', onclick);
	});

	it('removes listener', () => {
		const onclick = memory.onclick = node.onclick = () => {};
		updateElm(memory, {});
		expect(removeEventListener).toHaveBeenCalledWith('click', onclick);
	});

	it('adds style', () => {
		updateElm(memory, { style: { string: 'abc' } });
		expect(node.style).toEqual({ string: 'abc' });
	});

	it('removes style', () => {
		memory.style = node.style = { string: 'abc', boolean: true };
		updateElm(memory, { style: { boolean: true } });
		expect(node.style).toEqual({ boolean: true });
	});
});
