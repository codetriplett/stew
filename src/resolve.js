import execute from './execute';
import observe from './observe';

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
	const array = [...template];
	const [tag, key] = (typeof array[0] === 'string' ? array.shift() : '').trim().split(/\s*:\s*/);
	const object = typeof array[0] === 'object' && !Array.isArray(array[0]) ? array.shift() : undefined;
	const { document, _refs, refs } = context;
	let node = key === undefined ? _refs[i + 1] : _refs[0][key];

	if (tag === '') {
		// generate fragment with optional new state
		context = { ...context, _refs: node || {}, refs: [{}] };
		if (object) context.state = observe(object);
		const fragment = populate(array, context);

		if (key !== undefined) {
			refs[0][key] = context.refs[0];
		}

		return fragment;
	}

	// generate element
	const fragment = populate(array, context);
	if (!node) node = document.createElement(tag);

	if (object) {
		for (const [name, value] of Object.entries(object)) {
			node[name] = value;
		}
	}

	node.appendChild(fragment);
	refs[key] = node;
	return node;
}

export default function resolve (template, context, refs) {
	if (!template && template !== 0 || template === true) {
		// empty node
		return;
	} else if (typeof template === 'function') {
		// dynamic node
		return execute(template, context, refs);
	} else if (typeof template !== 'object') {
		// text node
		const text = String(template);
		return context.document.createTextNode(text);
	} else if (!Array.isArray(template)) {
		// static node
		return template;
	}

	// element node
	return prepare(template, context, refs);
}
