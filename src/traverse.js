import { evaluate } from './evaluate';

export function traverse (template, state = {}) {
	if (typeof template === 'string' || Array.isArray(template)) {
		return evaluate(template, state);
	}

	const { '': structure, ...attributes } = template;
	const [definition, ...content] = structure;
	const [selector, ...query] = definition.split(' ');
	const [tag, ...classes] = selector.split('.');

	if (classes.length && !attributes.hasOwnProperty('class')) {
		attributes.class = [];
	}

	const names = Object.keys(attributes).sort();

	const markup = `<${tag}${names.map(name => {
		let expression = attributes[name];

		if (name === 'class' && classes.length) {
			expression = [`${classes.join(' ')} `, ...expression];
		}

		return evaluate(expression, state, name);
	}).join('')}>`;

	if (!content.length) {
		return markup;
	}

	return `${markup}${content.map(template => {
		return traverse(template, state);
	}).join('')}</${tag}>`;
}
