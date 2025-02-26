import { isServer, find, insert, remove } from './dom';
import { queue } from './state';

export const tree = new WeakMap();
export const impulses = [[]];
export const followups = [[]];
export const promises = new Set();

function execute (callback, ...params) {
	try {
		return callback?.(...params);
	} catch (err) {
		console.error(err);
	}
}

export function onRender (callback) {
	if (impulses.length < 2) {
		const promiseArray = [...promises];
		promises.clear();

		if (queue.size) {
			promiseArray.push(new Promise(resolve => queue.add(resolve)));
		}

		// server can call this to await all active promises before returning result
		// - hydration is set up to wait for promise to resolve client side as well
		return Promise.all(promiseArray).then(() => {
			// no need to wait at top level when nothing is queued
			const value = execute(callback);
			return Promise.resolve(value);
		});
	} else if (isServer) {
		return;
	}

	// return a promise and add as followup
	return new Promise(resolve => {
		followups[0].push(() => {
			const value = execute(callback);
			resolve(value);
		});
	});
}

export function pick (dom, tagName) {
	let index;

	if (dom[1].tagName === tagName) {
		// avoids setting up loop if next node is correct tagName
		index = 1;
	} else {
		// find the next node with the correct tagName
		index = dom.findIndex((node, i) => i && node.tagName === tagName);
	}

	if (index > 0) {
		const node = dom.splice(1, index).pop();
		return [node, node.childNodes];
	}
}

// parentNode is the nearest non-fragment element (or root documentFragment from stew)
// - have parentNode be shadowRoot if element has attached one
export default function render (layout, framework, context, dom, container, i, childRef) {
	let ref = childRef || container[i + 2];
	let componentProps, componentChildren;

	element:
	if (Array.isArray(layout)) {
		const { document, updater } = framework;
		const [type, object, ...rest] = layout;
		const { '': key = '', ...props } = object || {};
		ref = key && container[1][key] || ref;
		let node = ref?.[0];
		let tagName = '';
		
		switch (typeof type) {
			case 'number': {
				const { '': depth = 0 } = context;
				tagName = `H${depth + type}`;
				break;
			}
			case 'string': {
				tagName = type.toUpperCase();
				break;
			}
			case 'object': {
				// TODO: test that this creates/updates/hydrates ref properly
				node = type;
				dom = [node, node];
				tagName = node.tagName;
				// TODO: need to inform parent to not append this one, it is a portal and should be left were it is in the DOM
				// - store in ref as '', but have reconciliation use input node
				// - this can skip hydration, since it is a client side feature
				// - maybe set in ref as null, and have remove() handle teardown for this as if it were a fragment
				break;
			}
			case 'function': {
				layout = type;
				componentProps = object;
				componentChildren = rest;
				break element;
			}
		}

		// TODO: allow other tagNames to share children if their keys match
		// - this would allow wrapping content from fragment into anchor tag without rebuilding those items
		// - would need to append all children from old element to new one, and then fill in the ref
		if (!ref || typeof ref[1]?.[''] !== 'string' || ref[0]?.tagName !== tagName) {
			if (!tagName) {
				node = node || document.createDocumentFragment();
			} else {
				dom = dom.length > 1 && pick(dom, tagName) || [document.createElement(tagName)];
				[node] = dom;
			}

			ref = [node, {}];
		}

		const refs = {};
		ref[1][''] = refs;
		let sibling;

		if (tagName) {
			// TODO: have updater switch to shadowRoot if element has prop to attach one
			node = updater(node, props);
		} else {
			context = { ...context, ...props };
			sibling = find(container, i);
		}

		const children = rest.map((layout, i) => {
			return render(layout, framework, context, dom, container, i, ref);
		});

		const previous = ref.splice(2, ref.length, ...children).filter(ref => {
			if (children.indexOf(ref) !== -1) {
				return true;
			}

			remove(ref, node);
		});

		for (const [i, childRef] of children.reverse().entries()) {
			if (childRef !== previous[i]) {
				sibling = insert(childRef, node, sibling);
			}
		}

		if (key && !childRef) {
			container[1][''][key] = ref;
		}

		refs[''] = key;
		ref[1] = refs;
		return ref;
	} else if (layout instanceof Promise) {
		// TODO: allow onRender from impulses to return promise
		// - the result of that can be put in the layout without having to trigger a second full render
		// - this is really good

		if (!ref || ref[1] !== layout) {
			// set up placeholder container
			const { document, tagName = 'div' } = framework;
			dom = dom.length > 1 && pick(dom, tagName) || [document.createElement(tagName)];
			const [node] = dom;
			ref = [node, layout];

			const promise = layout.then(layout => {
				// only reconcile if it hasn't been invalidated
				if (ref[1]) {
					layout = [node, {}, layout];
					const childRef = render(layout, framework, context, dom, [node], 0);
					ref.splice(2, ref.length, ...childRef.slice(2));
					promises.delete(promise);
				}
			});

			promises.add(promise);
		}

		return ref;
	}

	switch (typeof layout) {
		case 'object': {
			const { converter } = framework;
			componentProps = layout;
			layout = converter;
		}
		case 'function': {
			let key = componentProps?.[''];
			ref = key && container[1][key] || ref;

			if (!ref || typeof ref[1] !== 'function') {
				const [parentNode] = dom;
				const listeners = new Set();
				const memo = {};
				let teardowns = [];
				let props, children, childRef;
	
				// create new impulse
				const impulse = () => {
					if (!ref[1]) {
						return;
					}
	
					listeners.clear();
					impulses.unshift([impulse, listeners]);
					const result = execute(layout, { ...props, '': memo }, ...children);
					const followups = impulses.shift().splice(2);
					teardowns = followups.map(execute);
					const newChildRef = render(result, framework, context, dom, container, i, childRef || []);

					if (newChildRef === childRef) {
						return;
					}

					// reconcile happens here since impulse can trigger on its own
					const sibling = find(container, i);
					insert(newChildRef, parentNode, sibling);

					if (childRef) {
						remove(childRef, parentNode);
					}

					ref[0] = newChildRef[0];
					ref.splice(2, ref.length, ...newChildRef.slice(2));
					childRef = newChildRef;
				};

				ref = [null, (...params) => {
					if (params.length) {
						// forward params before calling
						[layout, context, props, children] = params;
						impulse();
						return;
					}

					// teardown
					teardowns.map(execute);

					// unsubscribe
					for (const listener of listeners) {
						listener.delete(impulse);
					}
				}];
				
				tree.set(impulse, impulses.slice(0));
			}

			if (key && !childRef) {
				container[1][''][key] = ref;
			}

			ref[1](layout, context, componentProps || context, componentChildren || []);
			return ref;
		}
		case 'number': {
			layout = String(layout);
		}
		case 'string': {
			let ref = container[i + 2];

			if (!ref || ref.length > 1) {
				if (!dom[1]?.nodeValue) {
					const { document } = framework;
					const node = document.createTextNode(layout);
					return [node];
				}

				const node = dom.splice(1, 1);
				ref = [node];
			}
			
			if (ref[0].nodeValue !== layout) {
				ref[0].nodeValue = layout;
			}

			return ref;
		}
	}
}
