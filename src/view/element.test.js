import { frameworks, converters, virtualFramework } from './dom';
import processElement, { managedProps, processText } from './element';

const [virtualDocument] = virtualFramework;

beforeEach(() => {
	frameworks.splice(0, frameworks.length, virtualFramework);
	converters.splice(0, converters.length, [0]);
});

describe('processText', () => {
	it('creates view', () => {
		const actual = processText('abc');
		expect(actual).toEqual([expect.anything()]);
		expect(String(actual[0])).toEqual('abc');
	});

	it('updates view', () => {
		const node = virtualDocument.createTextNode('abc');
		const view = [node];
		const actual = processText('xyz', view);
		expect(actual).toBe(view);
		expect(String(actual[0])).toEqual('xyz');
	});
	
	it('rejects empty view', () => {
		const view = [];
		const actual = processText('abc', view);
		expect(actual).not.toBe(view);
		expect(String(actual[0])).toEqual('abc');
	});
	
	it('rejects fragment view', () => {
		const view = Object.assign([undefined], { keyedViews: {} });
		const actual = processText('abc', view);
		expect(actual).not.toBe(view);
		expect(String(actual[0])).toEqual('abc');
	});

	it('rejects element view', () => {
		const node = virtualDocument.createElement('div')
		const view = [node];
		const actual = processText('abc', view);
		expect(actual).not.toBe(view);
		expect(String(actual[0])).toEqual('abc');
	});
});

describe('processElement', () => {
	it('creates element', () => {
		const actual = processElement('div');
		expect(actual).toEqual(Object.assign([expect.anything()], { keyedViews: {} }));
		expect(String(actual[0])).toEqual('<div></div>');
	});

	it('creates heading', () => {
		const actual = processElement(1);
		expect(actual).toEqual(Object.assign([expect.anything()], { keyedViews: {} }));
		expect(String(actual[0])).toEqual('<h1></h1>');
	});

	it('creates nested heading', () => {
		converters[0][0] = 1;
		const actual = processElement(1);
		expect(actual).toEqual(Object.assign([expect.anything()], { keyedViews: {} }));
		expect(String(actual[0])).toEqual('<h2></h2>');
	});

	it('adds attributes', () => {
		const actual = processElement('div', { className: 'abc' });
		expect(actual).toEqual(Object.assign([expect.anything()], { keyedViews: {} }));
		expect(String(actual[0])).toEqual('<div class="abc"></div>');
	});

	it('updates attributes', () => {
		const node = virtualDocument.createElement('div');
		node.className = 'abc';
		const view = Object.assign([node], { keyedViews: {} });
		const actual = processElement('div', { className: 'xyz' }, view);
		expect(actual).toBe(view);
		expect(String(actual[0])).toEqual('<div class="xyz"></div>');
		expect(managedProps.get(node)).toEqual(['className']);
	});

	it('rejects empty view', () => {
		const view = [];
		const actual = processElement('div', { className: 'abc' }, view);
		expect(actual).not.toBe(view);
		expect(String(actual[0])).toEqual('<div class="abc"></div>');
	});

	it('rejects fragment view', () => {
		const view = Object.assign([undefined], { keyedViews: {} });
		const actual = processElement('div', { className: 'abc' }, view);
		expect(actual).not.toBe(view);
		expect(String(actual[0])).toEqual('<div class="abc"></div>');
	});

	it('rejects text view', () => {
		const node = virtualDocument.createTextNode('abc');
		const view = Object.assign([node], { keyedViews: {} });
		const actual = processElement('div', { className: 'abc' }, view);
		expect(actual).not.toBe(view);
		expect(String(actual[0])).toEqual('<div class="abc"></div>');
	});

	it('rejects incompatible element view', () => {
		const node = virtualDocument.createElement('span');
		const view = Object.assign([node], { keyedViews: {} });
		const actual = processElement('div', { className: 'abc' }, view);
		expect(actual).not.toBe(view);
		expect(String(actual[0])).toEqual('<div class="abc"></div>');
	});
});
