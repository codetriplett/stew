import resolve from './resolve';
import execute from './execute';
import observe from './observe';

jest.mock('./execute');
jest.mock('./observe');

describe('resolve', () => {
	let document, state, containerRef, context;

	beforeEach(() => {
		document = {
			createTextNode (nodeValue) {
				return { nodeValue };
			},
			createDocumentFragment () {
				return {
					childNodes: [],
					appendChild (child) {
						this.childNodes.push(child);
					},
				};
			},
			createElement (tagName) {
				return {
					tagName,
					childNodes: [],
					appendChild (child) {
						this.childNodes.push(child);
					},
				};
			},
		};

		state = {};
		containerRef = [{}, {}];
		context = { document, state, ref: containerRef };

		jest.clearAllMocks();
		execute.mockReturnValue({ tagName: 'div' });
		observe.mockReturnValue({ key: 'value' });
	});

	it('resolves null', () => {
		const actual = resolve(null, context, containerRef, 0);
		expect(actual).toEqual(undefined);
	});

	it('resolves undefined', () => {
		const actual = resolve(undefined, context, containerRef, 0);
		expect(actual).toEqual(undefined);
	});

	it('resolves false', () => {
		const actual = resolve(false, context, containerRef, 0);
		expect(actual).toEqual(undefined);
	});

	it('resolves true', () => {
		const actual = resolve(true, context, containerRef, 0);
		expect(actual).toEqual(undefined);
	});

	it('resolves zero', () => {
		const actual = resolve(0, context, containerRef, 0);
		expect(actual).toEqual({ nodeValue: '0' });
	});

	it('resolves number', () => {
		const actual = resolve(123, context, containerRef, 0);
		expect(actual).toEqual({ nodeValue: '123' });
	});

	it('resolves text node', () => {
		const actual = resolve('abc', context, containerRef, 0);
		expect(actual).toEqual({ nodeValue: 'abc' });
	});

	it('resolves dynamic node', () => {
		const callback = () => {};
		const actual = resolve(callback, context, containerRef, 0);
		expect(actual).toEqual({ tagName: 'div' });
		expect(execute).toHaveBeenCalledWith(callback, context, containerRef, 0);
	});

	it('resolves static node', () => {
		const node = { tagName: 'div' };
		const actual = resolve(node, context, containerRef, 0);
		expect(actual).toBe(node);
	});

	it('resolves fragment node', () => {
		const object = { key: 'value' };
		const template = ['', object, 'xyz'];
		const actual = resolve(template, context, containerRef, 0);
		expect(actual).toMatchObject({ childNodes: [{ nodeValue: 'xyz' }] });
		expect(observe).toHaveBeenCalledWith(object);
	});

	it('resolves element node', () => {
		const template = ['div', { className: 'abc' }, 'xyz'];
		const actual = resolve(template, context, containerRef, 0);
		expect(actual).toMatchObject({ childNodes: [{ childNodes: [{ nodeValue: 'xyz' }] }], tagName: 'div', className: 'abc' });
	});
});
