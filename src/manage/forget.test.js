import { forget } from './forget';

describe('forget', () => {
	const removeChild = jest.fn();
	const teardown = jest.fn();
	let container, elm, node, child;

	beforeEach(() => {
		jest.clearAllMocks();
		container = { removeChild };
		elm = { '': [[], container] };
		node = document.createElement('div');
		child = { '': [[], node] };
	});

	it('removes node', () => {
		forget(child, elm);
		expect(removeChild).toHaveBeenCalledWith(node);
	});

	it('invokes teardown', () => {
		forget(teardown, elm);
		expect(teardown).toHaveBeenCalled();
		expect(removeChild).not.toHaveBeenCalled();
	});

	it('iterates over children', () => {
		const parentNode = document.createElement('div');
		parentNode.appendChild(node);
		forget({ '': [[child, teardown], parentNode] }, elm);

		expect(parentNode.childNodes).toHaveLength(0);
		expect(removeChild).toHaveBeenCalledWith(parentNode);
		expect(teardown).toHaveBeenCalled();
	});

	it('iterates over fragment', () => {
		forget({ '': [[child, teardown], {}] }, elm);

		expect(removeChild).toHaveBeenCalledWith(node);
		expect(teardown).toHaveBeenCalled();
	});
});
