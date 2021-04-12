export function updateElm (memory, props) {
	const { '': [, node], ...prevProps } = memory;

	for (let name of Object.keys({ ...prevProps, ...props })) {
		const value = props[name];
		let prevValue = prevProps[name];

		if (prevValue === value) {
			continue;
		} else if (name.startsWith('on')) {
			name = name.slice(2);
			if (prevValue) node.removeEventListener(name, prevValue);
			if (value) node.addEventListener(name, value);
		} else if (value === true) {
			node.toggleAttribute(name, true);
		} else if (!value && value !== '' && value !== 0) {
			node.removeAttribute(name);
		} else if (name === 'style') {
			const { style } = node;
			if (!prevValue) prevValue = {};

			for (const name of Object.keys({ ...prevValue, ...value })) {
				const rule = value[name];
				if (rule !== prevValue[name]) style[name] = rule;
			}
		} else {
			if (Array.isArray(value)) {
				value = value.filter(it => it && typeof it === 'string').join(' ');
			}

			node.setAttribute(name, value);
		}
	}
}
