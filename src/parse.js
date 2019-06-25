// import { stitch } from './stitch.js';

const independents = new RegExp([
	'^(wbr|track|source|param|meta|link|keygen|input',
	'|img|hr|embed|command|col|br|base|area|!doctype)$'
].join(''));

const openers = '{"(<';
const closers = '}")>';

// TODO: simplify this so stitch isn't required
// <div (scope) class=(condition)"prefix"{}"suffix"()"fallback">
// - if scope is a literal, it will also be set as its content
// - if tag allows user inputs its default onchange will update the scope value
// - onclick="key": click will toggle the value

// (key): process strings and variables only if condition passes
// (): guaranteed to process tag or attribute
// - if check fails it falls to the next one until one passes or none remain

// {key}: use value from current scope
// {}: use current scope as it is

// "value": set a literal string value

// key=: closes previous chain and starts new attribute

// adjacent {...} and "..." between (...) will be concatenated



// TODO (phase 1): parse and render plain html using only string attributes
// TODO (phase 2): add {} to pull from one state and concatenate with strings
// TODO (phase 3): add () to process tags or attributes conditionally

// between <>: chop up string by {}

/*
// the following format is easy to parse into and interpret when rendering
// - attribute array values alternate between [string, key, string, key, ...]
// - definition array values are [tag, scope, children]
// - keep arrays even for basic strings to reduce checks in render code

{ key: ['prefix', 'variable', 'suffix'], '': ['div', 'scope', [
	{ key: ['value'], '': ['span'] }
]] }
*/





	/*
	(update, element, stew) => {
		const template = {...};
		update(stew(template, element));
		update(state => stew(template, state, element));
	}
	*/

export function parse (string, closer) {
	// const elemental = closer === '>';
	// const stage = closers.indexOf(closer || ' ');
	// let pattern = closer && `\\${closer}` || '[<{]';

	// if (closer === '') {
	// 	pattern += '|</[^>]>';
	// } else if (stage > 0) {
	// 	pattern += `|[${openers.slice(0, stage)}]`;
	// }

	// const regex = new RegExp(`(.|\\s)*?(?=${pattern}|$)`);
	// const element = {};
	// let values = [];

	// while (string) {
	// 	let match = string.match(regex)[0];
	// 	const { length } = match;
	// 	const symbol = string[length];
	// 	const stage = openers.indexOf(string[length] || ' ');

	// 	if (elemental && element.q === undefined) {
	// 		const tag = match.match(/^[^\s]*\s*/)[0];

	// 		if (/^(\/|!doctype|[a-zA-Z]+)/.test(tag)) {
	// 			element.q = tag;
	// 			match = match.slice(tag.length);
	// 		}
	// 	}

	// 	string = string.slice(length + 1);

	// 	if (/[^\s]/.test(match)) {
	// 		values.push(!closer ? match.trim() : match);
	// 	}

	// 	if (symbol === closer) {
	// 		break;
	// 	} else if (stage !== -1) {
	// 		const closer = closers[stage];
	// 		let value = parse(string, closer);

	// 		string = value.pop();

	// 		if (closer === ')') {
	// 			if (value.length) {
	// 				element.i = value;
	// 			}

	// 			values = element.q.endsWith('=') ? [values[0]] : [];

	// 			continue;
	// 		} else if (closer !== '>') {
	// 			values.push(elemental && closer === '}' ? [value] : value);
	// 			continue;
	// 		}

	// 		value = value.shift();

	// 		const { q, c } = value;
	// 		const tag = q.match(/[^.[]*/)[0];

	// 		if (/^\//.test(tag)) {
	// 			break;
	// 		} else if (!independents.test(tag) && c === undefined) {
	// 			const content = parse(string, '');

	// 			string = content.pop();
	// 			value.c = content;
	// 		}

	// 		values.push(value);
	// 	}
	// }

	// if (!elemental) {
	// 	if (closer !== undefined && closer.length < 2) {
	// 		values.push(string);
	// 	}

	// 	return values;
	// }

	// if (values[values.length - 1] === '/') {
	// 	element.c = [];
	// 	values.pop();
	// }

	// const [first] = values;
	// const attributes = {};
	// let { q = '' } = element;

	// if (q.endsWith('=') && Array.isArray(first) && first.length === 1) {
	// 	const [name] = first;

	// 	if (name && /^\S+$/.test(name)) { 
	// 		element.n = name
	// 	}
	// }

	// q = q.trim().replace(/=$/, '');

	// stitch(values, '=').forEach(attribute => {
	// 	if (!Array.isArray(attribute)) {
	// 		q += `[${attribute}]`;
	// 		return;
	// 	}

	// 	const name = attribute.shift();
	// 	let value = attribute.shift();

	// 	if (name === 'class') {
	// 		const values = stitch(value);

	// 		value = values.pop();
	// 		q += `.${values.join('.')}`;
	// 	}

	// 	if (value.length) {
	// 		attributes[name] = value;
	// 	}
	// });

	// element.q = q;

	// if (Object.keys(attributes).length) {
	// 	element.a = attributes;
	// }

	// return [element, string];
}
