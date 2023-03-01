import execute from './execute';
import observe from './observe';

function populate (children, context, containerRef) {
	const fragment = context.document.createDocumentFragment();

	for (const [i, template] of children.entries()) {
		const child = resolve(template, context, containerRef, i);
		if (!child && child !== 0) continue;
		fragment.appendChild(child);
	}

	return fragment;
}

// figure out hydration in a way that can be repurposed for state changes
// - each template is tied to an existing node based on index
// - node is replaced with a new one if the tag name is incompatible
// - fragment nodes are stored by key under parent for later passes
// - key will be preferred to index on later passes

// 1) if node exists that matches key, use that one
// 2) else if node exists that matches index and tag, use that one
// 3) else create new node (and useEffect as mount, with no prev state object)
// 4) tear down any unclaimed nodes



/*
currentRef: [{ ...map }, ...childRefs], // nodes only added to map if they have a key
- map and nodes array is used even if callback only returns a single node
- map is a composite of all keys within a fragment that are not nested in a child fragment
- nested fragments will store their map in the parent map instead of the document fragment node
- child refs that are Arrays represent a fragment, while any other type is a single node
  - resolve will recursively unwrap fragment arrays, so they would never be a valid ref
*/

// TODO: have functions that return a single node instead of a fragment display their ref maps as if it was returned as a fragment of one
function prepare (template, context, containerRef, i) {
	// read template values
	const arr = [...template];
	const hasString = typeof arr[0] === 'string';
	const [tag, key] = (hasString ? arr.shift() : '').trim().split(/\s*:\s*/);
	const hasObject = typeof arr[0] === 'object' && !Array.isArray(arr[0]);
	const obj = hasObject ? arr.shift() : undefined;
	const [, keyedRefs, ...indexedRefs] = containerRef;
	const nodeRef = keyedRefs[key] || indexedRefs[i] || [, {}];
	let [node] = nodeRef;

	if (tag !== '' && !node) {
		// create new element
		node = context.document.createElement(tag);
	}

	if (obj) {
		if (tag === '') {
			// create new state and context if it has keys
			const state = observe(obj);
			if (state) context = { ...context, state };
		} else for (const [name, value] of Object.entries(obj)) {
			// add property to node
			node[name] = value;
		}
	}

	// process fragment and update refs
	const fragment = populate(arr, context, nodeRef);
	if (tag === '') node = fragment;
	else node.appendChild(fragment);
	if (key !== undefined) keyedRefs[key] = node;
	containerRef[i + 2] = nodeRef;
	return nodeRef[0] = node;
}

// ref: [ref,  { ...keyedRefs }, ...indexedRefs]
export default function resolve (template, context, containerRef, i) {
	if (!template && template !== 0 || template === true) {
		// empty node
		return;
	} else if (typeof template === 'function') {
		// dynamic node
		return execute(template, context, containerRef, i);
	} else if (typeof template !== 'object') {
		// text node
		const text = String(template);
		let node = containerRef[i + 2];
		if (node) node.nodeValue = text;
		else node = context.document.createTextNode(text);
		return containerRef[i + 2] = node;
	} else if (!Array.isArray(template)) {
		// static node
		return containerRef[i + 2] = template;
	}

	// element node
	return prepare(template, context, containerRef, i);
}
