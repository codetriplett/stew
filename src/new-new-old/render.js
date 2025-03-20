

// adds self to parent and returns node
// maybe last param should be dom [candidate, ...siblings]
// - shift items from dom if they are a fit (hydration)
// - element and fragment update their dom array, in addition to refs to be passed next time
// - this also makes it easier for fragments to move around, without having to search for ones to append back into fragment
// - container[1][''] = [...childNodes]

// maybe have candidates be an array giving [nextElement, nextTextNodes]
// - when hydrating element, take elemnet regardless of its tagName, and




// [type, memo, proxy, ...children]
// - if proxy is array, use that for dom, and process children as teardowns
// - else proxy will either represent the element, first child element, or null for portals
// - if child elements are expected, but there aren't any currently, insert a placeholder comment in its place

// [tagName, map, node, ...childRefs]
// []

// remove nulls/undefineds/booleans from childRefs




	// renderElement: renders children, with optional wrapper element
	// renderImpulse: renders custom layout, which can include children, and also updates itself in response to relevant state changes
	// renderPromise: renders children at first, then replaces them with layout from promise when that resolves
	// - not added to promises, like the component objects do, so server will not wait for them
	// - server will use null, undefined, or '' in its place, and the client side hydration will naturally capture the correct placeholder nodes









	// TODO: preload candidates into container recursively in the root stew call
	// - there will likely be less nodes than children in the full layout, so it will need to splice empties back in if there is not a match
	// - only do this while in hydration mode (when map is undefined)
	// - map should be set to {} when 


	// - adjust them within container slightly if they don't line up with container...
	// - if candidate isn't a text node when that was expected -> splice(i, 0, null) so that next child uses it
	// - if candidate is not the expected tagName -> check next and splice(i, 1) it if it is a match
	// - only do these adjustments when creating a new text or element node, and only if hydration mode is detected
	// - empty map param indicates hydration mode, since there were no previous keys to read from
	// - if a new element is created outside of hydration it wouldn't have candidates to read anyway
	// - have stew function fill in the initial tree, instead of building it on the fly here


	// 		// impulse

	// 		// [callback, ref, ...teardowns]
	// 		// - store its key in inner ref

	// 		if (tagName !== ref[0]) {
	// 			ref = [tagName, {}];
	// 		}

	// 		layout = execute(tagName, { '': {}, ...props });
	// 		const child = render(layout, context, document, container, i);
	// 		ref[1] = child;





	// 		// object: assumed to be promise
	// 		// - children are placeholder
	// 		// - props are new context (like fragment)
	// 		// - this is a lot less convoluted than figuring out how to handle standalone promises as children
	// 		// - they also act a little more like mini impulses, with just one followup

	// 		if (!Array.isArray(info) || tagName !== info[0]) {
	// 			// check if it's a promise here, and if not, treat it like a portal

	// 			// object here is the memo and children are its teardowns
	// 			const proxy = [tagName, {}];
	// 			ref = [null, proxy];
	// 		}

	// 		// store teardowns in proxy
	// 		const memo = ref[1][1];
	// 		container[1] = {};
	// 		render(tagName, context, container, i, map && {}, document, convert);
	// 		ref[1] = proxy;
	// 		return;

	// 		/*

	// 		const promise = memo.promise || memo.promise = new Promise(resolve => {

	// 		});

	// 		const portal = memo.portal || memo.portal

	// 		return ['', {},
	// 			[promise, {},
	// 				...placeholder
	// 			],
	// 		];

	// 		*/




	// 		// TODO: treat this as a proxy to unlock portal features
	// 		// - the '' prop defines a selector for the portal node (set it to empty if missing)
	// 		// - bind target nodes appendChild, insertBefore, and removeChild functions if no overrides are provided
	// 		// - have parent skip processing this child node if '' prop exists
			
	// 		// NOTE: maybe object could be either existing DOM element or virtual one
	// 		// - parent could store these refs in a WeakMap on its '' prop and store null for its position in the list of normal children
	// 		// - e.g. ref = map[''].get(tagName); (and set when creating ref for the first time)

			
	// 		// [object, {}, ...children]
	// 		// [promise, {}, ...children]
	// 		// [function, {}, ...children]
	// 		// NOTE: maybe this could have another purpose since portals could be created manually by calling another stew inside a function
	// 		// - manual implementation woudl need a teardown function that clears children from target node
	// 		// - it would be less messy if this just implemented a custom DOM node to allow boundaries that are fully customized
	// 		// - props and children would fill in 

	// 		tagName = node.tagName;


	// 		tagName = () => {
	// 			render(layout, context, container, i, map, document, convert)
	// 		};

	// 		return renderImpulse(tagName, context, container, i, ref, map, document, convert);
	// 	}
	// }
	
	// return renderElement(tagName, props, children, context, container, ref, map, document, convert);
