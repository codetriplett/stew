import { modify } from './modify';
import { dynamo } from './dynamo';
import { stitch } from './stitch';

export function render (item, state, ...parameters) {
	const { '': [...children], ...attributes } = item;
	const names = Object.keys(attributes).sort();
	const tag = children.shift();

	const markup = `<${tag}${names.map(name => {
		const values = dynamo(attributes[name], state, ...parameters);
		return modify(values, name, ...parameters);
	}).join('')}>`;

	if (!children.length) {
		return markup;
	}

	const values = dynamo(children, state, ...parameters);
	return `${markup}${stitch(values, ...parameters)}</${tag}>`;
}
