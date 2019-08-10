import { parse } from '../parse';
import { fetch } from '../fetch';

export const mock = jest.fn();

export default function (string, ...objects) {
	if (typeof string === 'object') {
		string[''] = string;

		if (objects.length) {
			string[''] = fetch(objects, string);

			const index = objects[0].split('.').reverse().find(value => {
				return value && !isNaN(value);
			});

			if (index) {
				string['.'] = Number(index);
			}
		}

		return string;
	} else if (/[{<]/.test(string)) {
		return parse(string);
	} else if (!objects.length) {
		const child = document.createTextNode(string);

		Object.defineProperty(child, 'nodeValue', {
			get: () => string,
			set: value => {
				mock(string, 'nodeValue', value);
				string = value;
			}
		});
		
		mock.mockClear();

		return child;
	}

	const element = document.createElement(string);
	const attributes = {};
	const children = [];

	if (typeof objects[0] === 'object' && !Array.isArray(objects[0])) {
		Object.assign(attributes, objects.shift());
	}

	if (Array.isArray(objects[0])) {
		children.push(...objects.shift());
	}

	for (const name in attributes) {
		element.setAttribute(name, attributes[name]);
	}

	for (let child of children) {
		element.appendChild(child);
	}

	Object.assign(element, {
		getAttribute: name => {
			if (attributes.hasOwnProperty(name)) {
				return attributes[name];
			}
			
			return null;
		},
		setAttribute: (name, value) => {
			mock(string, 'set', name, value);
			attributes[name] = value;
		},
		toggleAttribute: (name, force) => {
			mock(string, 'toggle', name, force);

			if (!attributes.hasOwnProperty(name)) {
				attributes[name] = '';
			}
		},
		removeAttribute: name => {
			mock(string, 'remove', name);
			delete attributes[name];
		},
		addEventListener: (name, action) => {
			mock(string, 'listen', name, action);
		}
	});
	
	mock.mockClear();

	return element;
}
