import { dynamo } from './dynamo';

export function render (item, state, ...parameters) {
	const { '': [...children], ...attributes } = item;
	const names = Object.keys(attributes).sort();
	const tag = children.shift();

	const markup = `<${tag}${names.map(name => {
		return dynamo(attributes[name], name, state, ...parameters);
	}).join('')}>`;

	if (!children.length) {
		return markup;
	}

	return `${markup}${dynamo(children, '', state, ...parameters)}</${tag}>`;
}
