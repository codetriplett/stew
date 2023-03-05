import execute, { documents, updaters } from './execute';
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


// hydrate: currentNode is empty, next child node is compatible
// create: currentNode is empty, next child node is not compatible
// update: currentNode is found

function clean (ref, oldKeyedRefs, oldIndexedRefs) {
	const [, newKeyedRefs, ...newIndexedRefs] = ref;
}

function process (item, state, containerRef, i, container, childNodes, oldKeyedRefs) {
	// get candidate ref
	const isHydrating = !oldKeyedRefs;
	let [, keyedRefs, ...indexedRefs] = containerRef;
	let ref = isHydrating ? childNodes[0] : indexedRefs[i];

	if (!Array.isArray(item)) {
		// convert to string and claim element if hydrating
		const nodeValue = String(item);

		if (!ref || !('nodeValue' in ref)) {
			// create new text node
			ref = documents[0].createTextNode(nodeValue);
		} else {
			// claim text node and update if necessary
			childNodes.shift();
			if (nodeValue !== ref.nodeValue) ref.nodeValue = nodeValue;
		}

		return ref;
	}

	// read template values
	const [str, obj, ...arr] = item;
	const [, tagName, key] = str.match(/^\s*(.*?)\s*(?::(.*?))?$/);
	const isFragment = tagName === '';
	if (isHydrating) ref = isFragment || !ref ? [] : [ref];
	else if (!ref) ref = oldKeyedRefs[key] || [, {}];
	let node = ref?.[0];

	if (isFragment) {
		node = { state: obj };
		// create new state and set proxy ref to parent if hydrating
		if (obj) node.state = state = observe(obj);
	} else {
		if (node?.tagName?.toLowerCase?.() !== tagName.toLowerCase()) {
			// create new element
			node = documents[0].createElement(tagName);
		} else {
			// claim element
			childNodes.shift();
		}

		// update attribute and set container and child nodes
		if (obj) updaters[0](node, obj);
		container = node;
		childNodes = [...node.childNodes];
	}
	
	// update refs and store previous keyed refs before resetting them
	if (key) keyedRefs[key] = ref;
	[, oldKeyedRefs] = ref.splice(0, 2, node, {});

	// update children
	for (const [i, childItem] of arr.entries()) {
		reconcile(childItem, state, ref, i, container, childNodes, oldKeyedRefs);
	}

	// remove outdated nodes and run teardown functions if necessary
	clean(ref, oldKeyedRefs, indexedRefs);
	return ref;
}

// 1) can sibling param be replaced by childNodes
// - static nodes should only be claimed when hydrating, but newly created nodes would also claim unless differentiated
export default function reconcile (item, state, containerRef, i, container, childNodes, oldKeyedRefs) {
	// static node
	let ref = item;

	if (!item && item !== 0 || item === true) {
		// empty node
		ref = undefined;
	} else if (typeof item === 'function') {
		// dynamic node
		ref = execute(item, state, containerRef, i, container, childNodes, oldKeyedRefs);
	} else if (typeof item !== 'object' || Array.isArray(item)) {
		// element node
		ref = process(item, state, containerRef, i, container, childNodes, oldKeyedRefs);
	}

	const node = Array.isArray(ref) ? ref[0] : ref;

	if (node && ('tagName' in node || 'nodeValue' in node)) {
		// insert or append non-fragment nodes
		const [sibling] = childNodes;
		if (sibling) container.insertBefore(node, sibling);
		else container.appendChild(node);
	}

	return containerRef[i + 2] = ref;
}
