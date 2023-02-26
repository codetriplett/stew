import execute from './execute';
import observe from './observe';

function shiftString (array, fallback) {
	const [first] = array;
	return typeof first === 'string' ? array.shift() : fallback;
}

function shiftObject (array, fallback) {
	const [first] = array;
	return typeof first === 'object' && !Array.isArray(first) ? array.shift() : fallback;
}

function populate (children, context) {
	const fragment = context.document.createDocumentFragment();

	for (const [i, template] of children.entries()) {
		const child = resolve(template, context, i);
		if (!child && child !== 0) continue;
		fragment.appendChild(child);
	}

	return fragment;
}

/*
currentRef: [{ ...map }, ...childRefs], // nodes only added to map if they have a key
- map and nodes array is used even if callback only returns a single node
- map is a composite of all keys within a fragment that are not nested in a child fragment
- nested fragments will store their map in the parent map instead of the document fragment node
- child refs that are Arrays represent a fragment, while any other type is a single node
  - resolve will recursively unwrap fragment arrays, so they would never be a valid ref
*/

// TODO: have functions that return a single node instead of a fragment display their ref maps as if it was returned as a fragment of one
function prepare (template, context, i) {
	const children = [...template];
	const [tag, key] = shiftString(children, '').trim().split(/\s*:\s*/);
	const { document, previousRefs, currentRefs } = context;
	let node = key === undefined ? previousRefs[i + 1] : previousRefs[0][key];

	if (tag === '') {
		// generate fragment with optional new state
		const object = shiftObject(children);
		context = { ...context, previousRefs: node || {}, currentRefs: [{}] };
		if (object) context.state = observe(object);
		const fragment = populate(children, context);

		if (key !== undefined) {
			currentRefs[0][key] = context.currentRefs[0];
		}

		return fragment;
	}

	// generate element
	const attributes = shiftObject(children, {});
	const fragment = populate(children, context);
	if (!node) node = document.createElement(tag);

	for (const [name, value] of Object.entries(attributes)) {
		node[name] = value;
	}

	node.appendChild(fragment);
	currentRefs[key] = node;
	return node;
}

export default function resolve (template, context, i) {
	if (!template && template !== 0 || template === true) {
		// empty node
		return;
	} else if (typeof template === 'function') {
		// dynamic node
		return execute(template, context, i);
	} else if (typeof template !== 'object') {
		// text node
		const text = String(template);
		return context.document.createTextNode(text);
	} else if (!Array.isArray(template)) {
		// static node
		return template;
	}

	// element node
	return prepare(template, context, i);
}
