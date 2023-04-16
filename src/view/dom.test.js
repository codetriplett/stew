import stew from '..';
import { virtualDocument } from './dom';

describe('virtualDocumnet', () => {
	it('creates text node', () => {
		const actual = virtualDocument.createTextNode('abc');
		expect(actual).toEqual({ nodeValue: 'abc', toString: expect.any(Function) });
		expect(String(actual)).toEqual('abc');
	});

	it('escapes special characters', () => {
		const actual = virtualDocument.createTextNode('<abc & xyz>');
		expect(actual).toEqual({ nodeValue: '<abc & xyz>', toString: expect.any(Function) });
		expect(String(actual)).toEqual('&lt;abc &amp; xyz&gt;');
	});

	it('creates element', () => {
		const actual = virtualDocument.createElement('div');

		expect(actual).toEqual({
			tagName: 'div',
			style: {},
			setAttribute: expect.any(Function),
			getAttribute: expect.any(Function),
			removeAttribute: expect.any(Function),
			parentElement: null,
			childNodes: [],
			appendChild: expect.any(Function),
			insertBefore: expect.any(Function),
			removeChild: expect.any(Function),
			querySelector: expect.any(Function),
			querySelectorAll: expect.any(Function),
			toString: expect.any(Function),
		});

		expect(String(actual)).toEqual('<div></div>');
	});

	it('sets attribute using method', () => {
		const actual = virtualDocument.createElement('div');
		actual.setAttribute('data-value', 'abc');
		expect(actual['data-value']).toEqual('abc');
	});

	it('does not overwrite static prop', () => {
		const actual = virtualDocument.createElement('div');
		actual.setAttribute('tagName', 'vid');
		expect(actual.tagName).toEqual('div');
	});

	it('gets attribute using method', () => {
		const actual = virtualDocument.createElement('div');
		actual['data-value'] = 'abc';
		expect(actual.getAttribute('data-value')).toEqual('abc');
	});

	it('does not get static prop', () => {
		const actual = virtualDocument.createElement('div');
		expect(actual.getAttribute('tagName')).toEqual(undefined);
	});

	it('removes attribute using method', () => {
		const actual = virtualDocument.createElement('div');
		actual['data-value'] = 'abc';
		actual.removeAttribute('data-value');
		expect(actual['data-value']).toEqual(undefined);
	});

	it('does not clear static prop', () => {
		const actual = virtualDocument.createElement('div');
		actual.removeAttribute('tagName');
		expect(actual.tagName).toEqual('div');
	});

	it('stringifies element attributes', () => {
		const actual = virtualDocument.createElement('div');
		Object.assign(actual, { id: 'lmno', className: 'abc xyz', tabIndex: 0 });
		expect(String(actual)).toEqual('<div class="abc xyz" id="lmno" tabindex="0"></div>');
	});
	
	it('does not sort attributes for server render', () => {
		stew.isServer = true;
		const actual = virtualDocument.createElement('div');
		Object.assign(actual, { id: 'lmno', className: 'abc xyz', tabIndex: 0 });
		expect(String(actual)).toEqual('<div id="lmno" class="abc xyz" tabindex="0"></div>');
		stew.isServer = false;
	});

	it('sets boolean attributes', () => {
		const actual = virtualDocument.createElement('div');
		Object.assign(actual, { 'data-active': true });
		expect(String(actual)).toEqual('<div data-active></div>');
	});

	it('escapes quotes in attribute values', () => {
		const actual = virtualDocument.createElement('div');
		Object.assign(actual, { 'data-value': "\"abc\"" });
		expect(String(actual)).toEqual('<div data-value="&quot;abc&quot;"></div>');
	});

	it('does not stringify invalid attribute names', () => {
		const actual = virtualDocument.createElement('div');
		Object.assign(actual, { '<"&">': () => {} });
		expect(String(actual)).toEqual('<div></div>');
	});

	it('does not stringify listeners', () => {
		const actual = virtualDocument.createElement('div');
		Object.assign(actual, { onclick: () => {} });
		expect(String(actual)).toEqual('<div></div>');
	});

	it('stringifies style attribute', () => {
		const actual = virtualDocument.createElement('div');
		actual.style = { color: 'green', fontSize: '12px' }
		expect(String(actual)).toEqual('<div style="color:green;font-size:12px;"></div>');
	});

	it('stringifies element children', () => {
		const actual = virtualDocument.createElement('div');
		actual.appendChild(virtualDocument.createElement('div'));
		actual.appendChild(virtualDocument.createElement('span'));
		expect(String(actual)).toEqual('<div><div></div><span></span></div>');
	});

	it('creates fragment', () => {
		const actual = virtualDocument.createDocumentFragment();

		expect(actual).toEqual({
			parentElement: null,
			childNodes: [],
			appendChild: expect.any(Function),
			insertBefore: expect.any(Function),
			removeChild: expect.any(Function),
			querySelector: expect.any(Function),
			querySelectorAll: expect.any(Function),
			toString: expect.any(Function),
		});

		expect(String(actual)).toEqual('');
	});

	it('stringifies fragment children', () => {
		const actual = virtualDocument.createDocumentFragment();
		actual.appendChild(virtualDocument.createElement('div'));
		actual.appendChild(virtualDocument.createElement('span'));
		expect(String(actual)).toEqual('<div></div><span></span>');
	});

	it('appends child', () => {
		const actual = virtualDocument.createDocumentFragment();
		const child = virtualDocument.createElement('div');
		actual.appendChild(child);
		expect(actual.childNodes).toEqual([child]);
		expect(child.parentElement).toBe(actual);
	});

	it('inserts child before', () => {
		const actual = virtualDocument.createDocumentFragment();
		const sibling = virtualDocument.createElement('div');
		const child = virtualDocument.createElement('div');
		actual.childNodes.push(sibling);
		actual.insertBefore(child, sibling);
		expect(actual.childNodes).toEqual([child, sibling]);
		expect(child.parentElement).toBe(actual);
	});

	it('queries for child', () => {
		const actual = virtualDocument.createDocumentFragment();
		const child = virtualDocument.createElement('div');
		actual.childNodes.push(child);
		expect(actual.querySelector('div')).toEqual(child);
	});
});

describe('querySelectorAll', () => {
	it('matches against tag', () => {
		const fragment = stew('', ['', null, ['div'], ['span'], ['div']], []);
		const actual = fragment.querySelectorAll('div');
		const { childNodes } = fragment;
		expect(actual).toEqual([childNodes[0], childNodes[2]]);
	});

	it('matches against id', () => {
		const fragment = stew('', ['', null, ['div'], ['span', { id: 'lmno' }]], []);
		const actual = fragment.querySelectorAll('#lmno');
		const { childNodes } = fragment;
		expect(actual).toEqual([childNodes[1]]);
	});

	it('matches against tag and id', () => {
		const fragment = stew('', ['', null, ['div', { id: 'lmno' }], ['span', { id: 'lmno' }]], []);
		const actual = fragment.querySelectorAll('span#lmno');
		const { childNodes } = fragment;
		expect(actual).toEqual([childNodes[1]]);
	});

	it('matches against single class', () => {
		const fragment = stew('', ['', null, ['div'], ['span', { className: 'abc xyz' }]], []);
		const actual = fragment.querySelectorAll('.abc');
		const { childNodes } = fragment;
		expect(actual).toEqual([childNodes[1]]);
	});

	it('matches against multiple classes', () => {
		const fragment = stew('', ['', null, ['div'], ['span', { className: 'abc xyz' }]], []);
		const actual = fragment.querySelectorAll('.abc.xyz');
		const { childNodes } = fragment;
		expect(actual).toEqual([childNodes[1]]);
	});

	it('matches against tag, id and classes', () => {
		const fragment = stew('', ['', null, ['div'], ['span', { id: 'lmno', className: 'abc xyz' }]], []);
		const actual = fragment.querySelectorAll('span#lmno.abc.xyz');
		const { childNodes } = fragment;
		expect(actual).toEqual([childNodes[1]]);
	});

	it('matches child nodes', () => {
		const fragment = stew('', ['', null, ['div', {}, ['span']]], []);
		const actual = fragment.querySelectorAll('span');
		const { childNodes } = fragment;
		expect(actual).toEqual([childNodes[0].childNodes[0]]);
	});

	it('matches parent and child nodes', () => {
		const fragment = stew('', ['', null, ['div', {}, ['div']]], []);
		const actual = fragment.querySelectorAll('div');
		const { childNodes } = fragment;
		expect(actual).toEqual([childNodes[0], childNodes[0].childNodes[0]]);
	});

	it('matches multiple selectors', () => {
		const fragment = stew('', ['', null, ['div', {}, ['span']]], []);
		const actual = fragment.querySelectorAll('div, span');
		const { childNodes } = fragment;
		expect(actual).toEqual([childNodes[0], childNodes[0].childNodes[0]]);
	});
});

describe('querySelector', () => {
	it('returns first match', () => {
		const fragment = stew('', ['', null, ['div', { id: 'abc' }], ['div', { id: 'xyz' }]], []);
		const actual = fragment.querySelector('div');
		const { childNodes } = fragment;
		expect(actual).toEqual(childNodes[0]);
	});

	it('matches child node', () => {
		const fragment = stew('', ['', null, ['div', {}, ['span']]], []);
		const actual = fragment.querySelector('span');
		const { childNodes } = fragment;
		expect(actual).toEqual(childNodes[0].childNodes[0]);
	});

	it('matches multiple selectors', () => {
		const fragment = stew('', ['', null, ['span']], []);
		const actual = fragment.querySelector('div, span');
		const { childNodes } = fragment;
		expect(actual).toEqual(childNodes[0]);
	});

	it('empty match', () => {
		const fragment = stew('', ['', null, ['span']], []);
		const actual = fragment.querySelector('div');
		expect(actual).toEqual(null);
	});
});

describe('defaultUpdater', () => {

});
