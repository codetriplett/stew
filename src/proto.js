// TODO: add the reuse/replace of past refs
// - this should simplify a lot and remove the need for props on arrays
// - fiber still needs to subscribe, but should be simpler


// TODO: have stew function wrap converter in callback that injects document
// - that way it doesn't need to be passed in here
export default function reconcile (info, document, updater, converter, context, dom, container, i) {
	if (Array.isArray(info)) {
		const [string, object, ...rest] = info;
		const { '': key, ...props } = object || {};
		const tagName = string.toUpperCase();
		let ref = key && container[1][key] || container[i + 2];

		if (!ref || !ref.length || 'nodeValue' in ref[0] || ref[0].tagName !== tagName) {
			// TODO: would it be worth using a documentFragment here?
			// - reconciliation still needs to look to parent siblings
			// - it technically is more efficient, since elements are only in memory until appended to an element
			const node = tagName ? document.createElement(tagName) : {};
			ref = [node, {}];
		}

		const refs = {};
		ref[1][''] = refs;

		if (string) {
			updater(ref[0], props);
		} else {
			context = { ...context, ...props };
		}

		const children = rest.map((info, i) => {
			return reconcile(info, document, updater, converter, context, ref, i);
		});

		if (key) {
			container[1][''][key] = i;
			refs[''] = key;
		}

		const previous = ref.splice(2, ref.length, ...children);
		ref[1] = refs;

		for (const [i, child] of children.entries()) {
			if (child === previous[i]) {
				continue;
			} else if (typeof child === 'string') {
				// TODO: handle the append/insert actions here, using dom param
				// - borrow this part from old stew code
				// - try to make it efficient regardless of whether nodes were added to the start or end of list
			}
		}

		return ref;
	}

	switch (typeof info) {
		case 'function': {
			const callback = info;
			context = { '': context };
			info = info(context);
			const child = reconcile(info, document, updater, converter, context, dom, container, i);
			return [callback, context, child];
		}
		case 'object': {
			const { '': key, ...props } = info;
			const node = converter({ '': document, ...props });
			return [node, key];
		}
		case 'number': {
			info = String(info);
		}
		case 'string': {
			let ref = container[i + 2];

			if (!ref || ref.length > 1) {
				const node = document.createTextNode(info);
				ref = [node];
			} else if (ref[0].nodeValue !== info) {
				ref[0].nodeValue = info;
			}

			return ref;
		}
	}

	return [];
}
