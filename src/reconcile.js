import execute, { frameworks } from './execute';
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

function append (node, dom) {
	if (node.parentElement) return;
	const { container } = dom;
	let sibling;

	// find the next valid sibling node
	while (dom && !sibling) {
		({ node: sibling, sibling: dom } = dom);
	}

	if (sibling) container.insertBefore(node, sibling);
	else container.appendChild(node);
}

// TODO: move as much generic stuff here as possible
// - try to make process common between fragments/non-fragments and creating/hydrating/updating
// - move hydrate back to spreading static nodes onto ref, then claiming and converting them to proper refs when they are a match
//   - would simplify having to switch utility of prevRefs param throughout, makes rules simpler
//   - portals can still be made by nesting stew() inside template (have stew return undefined so it doesn't get appended)
function populate (items, state, view, dom, hydrateNodes) {
	// update children
	for (let i = items.length - 1; i >= 0; i--) {
		reconcile(items[i], state, view, i, dom, hydrateNodes);
	}

	// TODO: clean up nodes that existed before but no longer do
	// - remove outdated nodes and run teardown functions if necessary
	// TODO: consider using fragment here to avoid reflows until finished
	// - groups of appended/inserted node are added to a fragment before actually adding to dom
	// - fragment uses the dom object of the first added (rightmost) node
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

function write (text, view = [], dom, hydrateNodes) {
	const nodeValue = String(text);
	let [node] = view;

	if (!node || !('nodeValue' in node)) {
		// create new text node
		node = frameworks[0][0].createTextNode(nodeValue);
		append(node, dom);
		return [node];
	}

	// claim text node and update if necessary
	if (hydrateNodes) hydrateNodes.pop();
	if (nodeValue !== node.nodeValue) node.nodeValue = nodeValue;
	return view;
};

// have fragment store the first element or text node as its node value
// - storing state object was only a solve for if the state object was its own impulse, but that can be handled by execute if needed
// - execute needs to maintain memory of its callbacks anyway, probably using the outerMemory and i as a compound key of some kind
// - if the node value is always either undefined or a valid node to attach to, updating the dom will be a lot simpler
function update (item, state, parentView, i, dom, hydrateNodes) {
	if (!item && item !== 0 || item === true) {
		// empty node
		return [];
	} else if (typeof item === 'object' && !Array.isArray(item)) {
		// static node
		append(item, dom);
		return [item];
	}

	// get candidate view
	let [futureViews, pastViews, ...views] = parentView;
	let view = hydrateNodes ? hydrateNodes.slice(-1) : views[i];

	if (!Array.isArray(item)) {
		// text node
		return write(item, view, dom, hydrateNodes);
	}

	// element or fragment node
	const [str, obj, ...arr] = item;
	const [, tagName, key] = str.match(/^\s*(.*?)\s*(?::(.*?))?$/);
	const isFragment = tagName === '';
	if (!view) view = pastViews[key] || [];
	let node;

	if (!isFragment) {
		[node] = view;

		if (node?.tagName?.toLowerCase?.() !== tagName.toLowerCase()) {
			// create new element
			node = frameworks[0][0].createElement(tagName);
			append(node, dom);
		}

		// update attributes and create new dom reference
		if (obj) frameworks[0][1](node, obj);
		dom = { container: node };

		// claim node and prepare new set for children
		if (hydrateNodes) {
			const { childNodes } = node;
			hydrateNodes.pop();
			hydrateNodes = [...childNodes]
		}
	} else if (obj) {
		// create new state
		state = observe(obj);
	}
	
	// update refs and temporarily store new future views in place of node
	if (key) futureViews[key] = view;
	futureViews = view[0] = {};
	const { sibling } = dom;
	populate(arr, state, view, dom, hydrateNodes);
	const { node: firstChild } = dom;
	if (isFragment && firstChild !== sibling) node = firstChild;
	view.splice(0, 2, node, futureViews);
	return view;
}

export default function reconcile (item, state, parentView, i, dom, hydrateNodes) {
	if (typeof item === 'function') {
		// dynamic node
		execute(item, state, parentView, i, dom, hydrateNodes);
		return;
	}

	// TODO: is there a benefit to maintaining dom reference if it is just going to create a new one for sibling?
	// - go back to reconcile returning the new dom object
	const sibling = { ...dom };
	const view = update(item, state, parentView, i, dom, hydrateNodes);
	const [node] = view;
	parentView[i + 2] = view;
	if (node) Object.assign(dom, { node, sibling });
}
