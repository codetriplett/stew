import { dynamo } from './dynamo';

export function render (item, state) {
	const { '': [...children], ...attributes } = item;
	const names = Object.keys(attributes).sort();
	const tag = children.shift();

	const markup = `<${tag}${names.map(name => {
		let value = attributes[name];
		
		if (Array.isArray(value)) {
			value = dynamo(state, ...value);
		}

		return ` ${name}="${value}"`;
	}).join('')}>`;

	if (!children.length) {
		return markup;
	}

	return `${markup}${dynamo(state, ...children)}</${tag}>`;
}
