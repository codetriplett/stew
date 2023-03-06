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

function clean (container, prevIndexedRefs, indexedRefs) {
	// console.log(prevIndexedRefs, indexedRefs);
}

function append (container, node, sibling) {
	if (node.parentElement) return;
	let siblingNode;

	// find the next valid sibling node
	while (sibling && !siblingNode) {
		const { node, next } = sibling;
		siblingNode = node;
		sibling = next;
	}

	if (siblingNode) container.insertBefore(node, siblingNode);
	else container.appendChild(node);
}

export default function reconcile (item, state, containerRef, i, prevRefs, container, sibling) {
	if (!item && item !== 0 || item === true) {
		// empty node
		containerRef[i + 2] = undefined;
		return sibling;
	} else if (typeof item === 'function') {
		// dynamic node
		return execute(item, state, containerRef, i, prevRefs, container, sibling);
	} else if (typeof item === 'object' && !Array.isArray(item)) {
		// static node
		containerRef[i + 2] = item;
		append(container, item, sibling);
		return { node: item, next: sibling };
	}

	// get candidate ref
	const isHydrating = Array.isArray(prevRefs);
	let [, keyedRefs, ...indexedRefs] = containerRef;
	let ref = isHydrating ? prevRefs[0] : indexedRefs[i];
	let node;

	if (!Array.isArray(item)) {
		// text node
		const nodeValue = String(item);

		if (!ref || !('nodeValue' in ref)) {
			// create new text node
			ref = documents[0].createTextNode(nodeValue);
			append(container, ref, sibling);
		} else {
			// claim text node and update if necessary
			if (isHydrating) prevRefs.shift();
			if (nodeValue !== ref.nodeValue) ref.nodeValue = nodeValue;
		}

		containerRef[i + 2] = ref;
		return { node: ref, next: sibling };
	}

	// element or fragment node
	const [str, obj, ...arr] = item;
	const [, tagName, key] = str.match(/^\s*(.*?)\s*(?::(.*?))?$/);
	const isFragment = tagName === '';
	let originalSibling = sibling;
	if (isHydrating) ref = isFragment || !ref ? [] : [ref];
	else if (!ref) ref = prevRefs[key] || [, {}];
	const prevIndexedRefs = ref.slice(2);
	node = ref?.[0];

	if (isFragment) {
		node = { state: obj };
		// create new state and set proxy ref to parent if hydrating
		if (obj) node.state = state = observe(obj);
	} else {
		if (node?.tagName?.toLowerCase?.() !== tagName.toLowerCase()) {
			// create new element
			node = documents[0].createElement(tagName);
			append(container, node, sibling);
		} else if (isHydrating) {
			// claim element
			prevRefs.shift();
		}

		// update attribute and set container and child nodes
		if (obj) updaters[0](node, obj);
		const { childNodes } = container = node;
		sibling = childNodes[childNodes.length - 1];

		if (isHydrating) {
			prevRefs = [...childNodes];
			prevIndexedRefs.push(...childNodes);
		}
	}
	
	// update refs and store previous keyed refs before resetting them
	if (key) keyedRefs[key] = ref;
	const prevRefCore = ref.splice(0, 2, node, {});
	if (!isHydrating) [, prevRefs] = prevRefCore;

	// update children
	for (let i = arr.length - 1; i >= 0; i--) {
		sibling = reconcile(arr[i], state, ref, i, prevRefs, container, sibling);
	}

	// remove outdated nodes and run teardown functions if necessary
	clean(container, prevIndexedRefs, ref.slice(2));
	containerRef[i + 2] = ref;
	if (sibling === originalSibling) return sibling;
	if (isFragment) node = sibling.node;
	return { node, next: originalSibling };
}
