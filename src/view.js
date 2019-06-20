export function view (...parameters) {
	let selector = /[.[]/.test(parameters[0]) ? parameters.shift() : '';
	let structure = typeof parameters[0] !== 'function' && parameters.shift();

	const transform = parameters.shift();
	const array = selector.endsWith('*');
	const boolean = typeof structure === 'string' && structure.endsWith('?');

	selector = selector.replace(/\.?\*?$/, '');

	if (boolean) {
		structure = structure.slice(0, -1);
	}

	function extract (element) {
		if (selector) {
			element = Array.from(element.querySelectorAll(selector)) || [];
		} else {
			element = [element];
		}

		const values = element.map(element => {
			let result;

			if (!element) {
				result = boolean ? false : '';
			} else if (!structure) {
				result = boolean ? true : element.textContent;
			} else if (typeof structure === 'object') {
				let entries;

				if (Array.isArray(structure)) {
					entries = structure.entries();
					result = [];
				} else {
					entries = Object.entries(structure);
					result = {};
				}

				for (const [key, value] of entries) {
					if (typeof value === 'object') {
						value = view('.', value);
					}
					
					if (typeof value === 'function') {
						result[key] = value(element);
					} else {
						result[key] = value;
					}
				}
			} else if (boolean) {
				result = element.hasAttribute(structure);
			} else if (structure === 'class') {
				const values = selector.match(/(\.[^.[]+)?/g);

				result = element.className.split(/\s+/).filter(value => {
					return values.indexOf(`.${value}`) === -1;
				}).join(' ');
			} else {
				result = element.getAttribute(structure) || '';
			}

			return transform ? transform(result, element) : result;
		});

		return array ? values : values[0];
	}

	return extract;
}
