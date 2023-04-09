import { frameworks } from '.';
import processImpulse, { fibers } from './impulse';
import { appendNode, deactivateFiber, populateChildren } from './dom';

export const managedProps = new WeakMap();

function processText (text, view = [], dom) {
	const nodeValue = String(text);
	let [node] = view;

	if (!node || !('nodeValue' in node)) {
		// create new text node
		const [[document]] = frameworks;
		node = document.createTextNode(nodeValue);
		appendNode(node, dom);
		return [node];
	}

	// claim text node and update if necessary
	if (nodeValue !== node.nodeValue) node.nodeValue = nodeValue;
	return view;
};

function processElement (tagName, obj, view, hydrateNodes) {
	const [framework] = frameworks;
	const [document, updater, defaultProps] = framework;
	let [node] = view;

	if (!hydrateNodes && !('keyedViews' in view) || tagName !== node?.tagName?.toLowerCase?.()) {
		// register defaults if not yet done
		if (!Object.prototype.hasOwnProperty.call(defaultProps, tagName)) {
			const example = document.createElement(tagName);
			defaultProps[tagName] = example;
		}

		// create new element and attach to dom
		node = document.createElement(tagName);
		view = Object.assign([node], { keyedViews: {} });
	} else if (hydrateNodes) {
		// claim node and prepare new set for children
		hydrateNodes.pop();
		view.keyedViews = {};
	}
	
	// update attributes
	if (obj) {
		const prevNames = managedProps.get(node);
		updater(node, obj, prevNames, defaultProps[node.tagName.toLowerCase()]);
		managedProps.set(node, Object.keys(obj));
	}

	return view;
}

function processNode (info, state, parentFiber, parentView, i, dom, hydrateNodes) {
	if (!info && info !== 0) {
		// empty node
		return [];
	} else if (typeof info === 'object' && !Array.isArray(info)) {
		// static node
		appendNode(info, dom);
		return [info];
	}

	// get candidate view
	const { doAppend } = dom;
	let view = hydrateNodes ? hydrateNodes.slice(-1) : parentView[i + 1];

	if (info === true) {
		// persist node
		if (!view) return [];
		const [node] = view;
		if (doAppend && node) appendNode(node, dom);
		return view;
	} else if (!Array.isArray(info)) {
		// text node
		const textView = processText(info, view, dom);
		if (hydrateNodes && textView === view) hydrateNodes.pop();
		return textView;
	}

	// element or fragment node
	let [str, obj, ...arr] = info;
	const indexedView = view;
	const hasKey = ~str.indexOf(':');
	let [, tagName, key] = hasKey ? str.match(/^\s*(.*?)\s*(?::(.*?))?$/) : [, str];
	if (!hydrateNodes) view = hasKey && parentView.keyedViews[key] || indexedView || [];
	let [node] = view;

	if (tagName === '') {
		// reject view if it was for an element
		if (node || !('keyedViews' in view)) view = Object.assign([], { keyedViews: {} });
		if (obj) state = obj;

		// flag dom as needing to append children if fragment moves
		if (!doAppend) dom.doAppend = view !== indexedView;
	} else {
		// create or update node
		[node] = view = processElement(tagName.toLowerCase(), obj, view, hydrateNodes);

		// update dom
		if (doAppend || view !== indexedView) appendNode(node, dom);
		dom = { container: node };

		if (hydrateNodes) {
			// prepare new set for children
			hydrateNodes = [...node.childNodes];
		}
	}

	// update views and temporarily store new future views in place of node
	if (hasKey) parentView.keyedViews[key] = view;
	populateChildren(arr, state, parentFiber, view, dom, hydrateNodes);
	dom.doAppend = doAppend;
	return view;
}

export default function reconcileNode (info, state, parentFiber, parentView, i, dom, hydrateNodes) {
	if (typeof info === 'function') {
		if (!frameworks[0]?.isServer) {
			// dynamic node
			processImpulse(info, state, parentFiber, parentView, i, dom, hydrateNodes);
			return;
		}

		// treat as static layout on server
		info = info(state);
	}

	// dom node
	const sibling = { ...dom };
	const view = processNode(info, state, parentFiber, parentView, i, dom, hydrateNodes);
	let [node] = parentView[i + 1] = view;
	if (!node && dom.node !== sibling.node) node = dom.node;
	if (node) Object.assign(dom, { node, sibling: undefined });

	// clear memo props and run teardowns
	const { fiber } = view;
	if (fiber && fiber !== fibers[0]) deactivateFiber(fiber);
}
