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

// TODO: move as much generic stuff here as possible
// - try to make process common between fragments/non-fragments and creating/hydrating/updating
// - move hydrate back to spreading static nodes onto ref, then claiming and converting them to proper refs when they are a match
//   - would simplify having to switch utility of prevRefs param throughout, makes rules simpler
//   - portals can still be made by nesting stew() inside template (have stew return undefined so it doesn't get appended)
function populate (items, state, ref, prevRefs, container, sibling) {
	const prevIndexedRefs = ref.slice(2);

	// update children
	for (let i = items.length - 1; i >= 0; i--) {
		sibling = reconcile(items[i], state, ref, i, prevRefs, container, sibling);
	}

	// remove outdated nodes and run teardown functions if necessary
	// - move clean up code into this function
	clean(container, prevIndexedRefs, ref.slice(2));
	return sibling;
}

// execute
// - when encountered while populating children...
//   - run callback and process its result in place of the function in the template
//   - store above functionality as callback in stack that is called when subscribed state properties change
//   - new keyed refs object needs to be created and passed to reconcile so it can be passed to the original callback
// - when triggered from a state prop change
//   - run wrapped callback

// refs
// - would reconcile be easier if it always stored memories as arrays, [node, map, children]


function write (item, ref, prevRefs, container, sibling) {
	const nodeValue = String(item);
	const isHydrating = Array.isArray(prevRefs);
	let node = ref?.[0];

	if (!node || !('nodeValue' in node)) {
		// create new text node
		node = documents[0].createTextNode(nodeValue);
		append(container, ref, sibling);
		return [node];
	}

	// claim text node and update if necessary
	if (isHydrating) prevRefs.pop();
	if (nodeValue !== node.nodeValue) node.nodeValue = nodeValue;
	return ref;
};


// have fragment store the first element or text node as its node value
// - storing state object was only a solve for if the state object was its own impulse, but that can be handled by execute if needed
// - execute needs to maintain memory of its callbacks anyway, probably using the outerMemory and i as a compound key of some kind
// - if the node value is always either undefined or a valid node to attach to, updating the dom will be a lot simpler
function update (item, state, outerMemory, i, prevRefs, container, sibling) {
	if (!item && item !== 0 || item === true) {
		// empty node
		return [];
	} else if (typeof item === 'object' && !Array.isArray(item)) {
		// static node
		append(container, item, sibling);
		return [item];
	}

	// get candidate ref
	const isHydrating = Array.isArray(prevRefs);
	let [, keyedRefs, ...indexedRefs] = outerMemory;
	let ref = isHydrating ? prevRefs.slice(-1) : indexedRefs[i];

	if (!Array.isArray(item)) {
		// text node
		return write(item, ref, prevRefs, container, sibling);
	}

	// element or fragment node
	const [str, obj, ...arr] = item;
	const [, tagName, key] = str.match(/^\s*(.*?)\s*(?::(.*?))?$/);
	const isFragment = tagName === '';
	if (isHydrating && isFragment) ref = [];
	else if (!ref) ref = prevRefs[key] || [, {}];
	[node] = ref;

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
			prevRefs.pop();
		}

		// update attribute and set container and child nodes
		if (obj) updaters[0](node, obj);
		const { childNodes } = container = node;
		sibling = undefined;

		if (isHydrating) {
			prevRefs = [...childNodes];
			// prevIndexedRefs.push(...childNodes);
		}
	}
	
	// update refs and store previous keyed refs before resetting them
	if (key) keyedRefs[key] = ref;
	const prevRefCore = ref.splice(0, 2, node, newKeyedRefs);
	if (!isHydrating) [, prevRefs] = prevRefCore;
	const finalSibling = populate(arr, state, ref, prevRefs, container, sibling);
	if (isFragment) ref[0] = finalSibling === sibling ? undefined : finalSibling.node;
	return ref;
}

export default function reconcile (item, state, outerMemory, i, prevRefs, container, sibling) {
	if (typeof item === 'function') {
		// dynamic node
		return execute(item, state, outerMemory, i, prevRefs, container, sibling);
	}

	const ref = update(item, state, outerMemory, i, prevRefs, container, sibling);
	const [node] = ref;
	outerMemory[i + 2] = ref;
	return node ? { node, next: sibling } : sibling;
}
