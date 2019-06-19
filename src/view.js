export function view (...parameters) {
	let selector;
	let structure;
	let transform;

	if (/[.[]/.test(parameters[0])) {
		selector = parameters.shift().replace(/\.$/, '') || undefined;
	}

	if (typeof parameters[0] !== 'function') {
		structure = parameters.shift();
	}

	if (typeof parameters[0] === 'function') {
		transform = parameters.shift();
	}

	function extractor (element, mode, ...extras) {
		if (selector && mode !== 'item') {
			const resolving = typeof mode === 'function';

			if (mode === 'array' || resolving) {
				element = Array.from(element.querySelectorAll(selector));

				return element.map(element => {
					const props = extractor(element, 'item', selector);
					return resolving ? mode(props, element, ...extras) : props;
				});
			}

			element = element.querySelector(selector);
		}

		let result = {};

		if (Array.isArray(structure)) {
			Object.assign(result, ...structure.map(extractor => {
				const object = extractor(element, undefined, selector);
				return typeof object === 'object' ? object : {};
			}));
		} else if (typeof structure === 'object') {
			for (const key in structure) {
				const value = structure[key];

				if (typeof value === 'function') {
					result[key] = value(element, undefined, selector);
				} else {
					result[key] = value;
				}
			}
		} else if (typeof structure !== 'string') {
			result = structure === undefined ? element.innerHTML : undefined;
		} else if (mode === 'boolean') {
			result = element.hasAttribute(structure);
		} else {
			result = element.getAttribute(structure) || '';

			if (result && structure === 'class') {
				selector = selector || extras[0] || '';
				result = ` ${result.trim().replace(/\s+/g, ' ')} `;
				
				selector.match(/(\.[^.[]+)?/g).forEach(value => {
					const regex = new RegExp(` ${value.slice(1)} `, 'g');
					result = result.replace(regex, ' ');
				});

				result = result.trim();
			}
		}

		if (transform) {
			result = transform(result, element);
		}

		return result;
	};

	extractor.asArray = element => extractor(element, 'array');
	extractor.asBoolean = element => extractor(element, 'boolean');

	return extractor;
}
