export function modify (memory, props, content) {
	const { '': [text, node, tag], ...attributes } = memory;

	if (!tag) {
		if (!content && content !== 0 || content === true) content = '';
		if (content !== text) node.nodeValue = memory[''][0] = content;
		return;
	}

	for (let name of Object.keys({ ...attributes, ...props })) {
		const value = props[name];
		let prev = attributes[name];

		if (prev === value) {
			continue;
		} else if (name.startsWith('on')) {
			name = name.slice(2);
			if (prev) node.removeEventListener(name, prev);
			if (value) node.addEventListener(name, value);
		} else if (value === true) {
			node.toggleAttribute(name, true);
		} else if (!value && value !== '' && value !== 0) {
			node.removeAttribute(name);
		} else if (name === 'style') {
			const { style } = node;
			if (!prev) prev = {};

			for (const name of Object.keys({ ...prev, ...value })) {
				const rule = value[name];
				if (rule !== prev[name]) style[name] = rule;
			}
		} else {
			if (Array.isArray(value)) {
				value = value.filter(it => it && typeof it === 'string').join(' ');
			}

			node.setAttribute(name, value);
		}
	}
	
	Object.assign(memory, props);
}
