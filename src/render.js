import { evaluate } from './evaluate';
import { modify } from './modify';
import { traverse } from './traverse';

export function render (value, ...parameters) {
	const { '': [...children], ...attributes } = value;
	const names = Object.keys(attributes).sort();
	const tag = children.shift();

	const markup = `<${tag}${names.map(name => {
		const values = evaluate(attributes[name], ...parameters);
		return modify(values, name);
	}).join('')}>`;

	if (!children.length) {
		return markup;
	}

	return `${markup}${traverse(children, ...parameters)}</${tag}>`;
}
