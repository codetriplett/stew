import execute, { documents } from './execute';
import observe from './observe';

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




// TODO: NEW PROCESS FOR HYDRATING AND RENDERING
// - when nodeRef is a non-array object
//   - splice out the ref at the given index and use that instead of the keyed ref if one was found
//   - if template is a non-fragment, create new nodeRef that sets all of its childNodes as separate children
//   - else, pass containerRef to its children instead of setting up a new one
// - return nodeRef instead of node and splice it back onto containerRef
// - this will allow fragments to claim multiple nodes and replace those with a single fragment ref



// only create new node ref before processing children if node is not a fragment
// otherwise, set an offset to add to the child indexes


// hydrate: currentNode is empty, compatible node found (static)
// create: currentNode is empty, no compatible node found
// update: currentNode is found
function prepare (item, ctx, srcRef, srcIdx, container, sibling) {
	// get previous ref
	let [currentNode, keyedRefs, ...indexedRefs] = srcRef;
	const isHydrating = currentNode === undefined;
	let ref = indexedRefs[srcIdx];

	if (!Array.isArray(item)) {
		// convert to string and claim element if hydrating
		const nodeValue = String(item);

		if (!ref || !('nodeValue' in ref)) {
			// create new text node
			ref = documents[0].createTextNode(nodeValue);
		} else {	
			// claim text node and update if necessary
			if (isHydrating) indexedRefs.splice(srcIdx, 1);
			if (nodeValue !== ref.nodeValue) ref.nodeValue = nodeValue;
		}

		return ref;
	}

	// read template values
	const [str, obj, ...arr] = item;
	const [, tagName, key] = str.match(/^\s*(.*?)\s*(?::(.*?))?$/);
	const isFragment = tagName === '';
	let [node] = ref = keyedRefs[key] || ref || [, {}];
	let proxyRef = ref;

	if (isFragment) {
		// pull from parent ref while hydrating and create new context
		if (isHydrating) proxyRef = srcRef;
		node = ctx = { ...ctx };
	} else {
		if (!node || node.tagName.toLowerCase() === tagName.toLowerCase()) {
			// create new element
			node = documents[0].createElement(tagName);
		} else if (isHydrating) {
			// claim element
			indexedRefs.splice(srcIdx, 1);
		}
		
		// set new reference point for inserting children
		container = node;
		sibling = container.childNodes[0];
	}

	if (obj) {
		if (isFragment) {
			// create new state and context if it has keys
			const state = observe(obj);
			if (state) ctx.state = state;
		} else for (const [name, value] of Object.entries(obj)) {
			// add property to node if it needs to be updated
			if (node[name] === value) continue;
			node[name] = value;
		}
	}

	// update children
	for (const [i, template] of arr.entries()) {
		const idx = isHydrating ? srcIdx : i;
		const child = resolve(template, ctx, proxyRef, idx, container, sibling);
		if (!child && child !== 0) continue;
		sibling = child;
	}

	// update refs
	if (key) keyedRefs[key] = ref;
	if (isHydrating) srcRef.splice(srcIdx, 0, ref);
	ref[0] = node;
	return ref;
}

export default function resolve (item, ctx, srcRef, srcIdx, container, sibling) {
	// static node
	let ref = item;

	if (!item && item !== 0 || item === true) {
		// empty node
		ref = undefined;
	} else if (typeof item === 'function') {
		// dynamic node
		ref = execute(item, ctx, srcRef, srcIdx, container, sibling);
	} else if (typeof item !== 'object' || Array.isArray(item)) {
		// element node
		ref = prepare(item, ctx, srcRef, srcIdx, container, sibling);
	}

	const node = Array.isArray(ref) ? ref[0] : ref;

	if (node && ('tagName' in node || 'nodeValue' in node)) {
		// insert or append non-fragment nodes
		if (sibling) container.insertBefore(node, sibling);
		else container.appendChild(node);
	}

	return srcRef[srcIdx + 2] = ref;
}
