export function render (template, state, element, option) {
	const generate = option === undefined || typeof option === 'number';
	const extract = typeof option === 'string';

	if (typeof state !== 'object') {
		state = { '': state };
	}

	if (typeof template !== 'object') {
		return template;
	} else if (Array.isArray(template)) {
		const [key = '', prefix = '', suffix = ''] = template;
		const { nodeValue } = element || {};
		let { [key]: value = '' } = state;

		if (extract) {
			const finish = -suffix.length || undefined;

			value = typeof element === 'string' ? element : nodeValue;
			
			if (typeof value === 'string') {
				state[`${option}${key}`] = value.slice(prefix.length, finish);
			}
		} else {
			if (template.length > 1) {
				value = `${prefix}${value}${suffix}`;
			}
		
			if (typeof nodeValue === 'string' && value !== nodeValue) {
				element.nodeValue = value;
			}
		}

		return value;
	}

	const { '': structure, ...attributes } = template;
	const [tagName, scopeKey, childTemplates] = structure;
	let markup = `<${tagName}`;

	for (const name in attributes) {
		const listener = name.startsWith('on');
		const object = listener && typeof option === 'object' ? option : state;
		const reference = generate ? undefined : element.getAttribute(name);
		let value = render(attributes[name], object, reference, option);

		if (generate) {
			markup += listener ? '' : ` ${name}="${value}"`;
			continue;
		} else if (extract) {
			return '';
		}
		
		const present = element.hasAttribute(name);

		if (listener) {
			if (!present) {
				element.addEventListener(name.replace(/^on/, ''), value);
			}

			value = 'javascript:void(0);';
		}
		
		if (value === true && !present) {
			element.toggleAttribute(name, true);
		} else if (value === false && present) {
			element.removeAttribute(name);
		} else if (value !== reference) {
			element.setAttribute(name, value);
		}
	}

	if (typeof option === 'number') {
		element += `-${option}`;
	}

	markup += `${scopeKey && generate ? ` data--="${element}"` : ''}>`;

	if (!childTemplates) {
		return markup;
	}

	let childNode = generate ? undefined : element.childNodes[0];
	
	childTemplates.forEach((childTemplate, templateIndex) => {
		const [tagName, scopeKey] = childTemplate[''] || [];
		const childStates = extract ? [] : [state];
		const childElements = [];
		let childOption = option;
		let repeatable = false;

		if (scopeKey) {
			if (extract) {
				childOption += `${scopeKey}.`;
			} else {
				const object = childStates.shift()[scopeKey];

				if (Array.isArray(object)) {
					repeatable = Array.isArray(object);
					childStates.push(...object);
				} else if (object !== undefined) {
					childStates.push(object);
				}
			}

			const idRegex = new RegExp(`^${templateIndex}(-|$)`);

			while (childNode) {
				const id = childNode.getAttribute('data--');

				if (!idRegex.test(id)) {
					break;
				}

				repeatable = repeatable || id.indexOf('-') !== -1;
				childElements.push(childNode);
				childNode = childNode.nextSibling;
			}
		} else if (childNode) {
			childElements.push(childNode);
			childNode = childNode.nextSibling;
		}

		childStates.forEach((childState, stateIndex) => {
			let childElement = childElements.shift();

			if (generate) {
				childElement = templateIndex;
				option = repeatable ? stateIndex : undefined;
			} else if (!childElement) {
				childElement = document.createElement(tagName);

				if (childNode) {
					element.insertBefore(childElement, childNode);
				} else {
					element.appendChild(childElement);
				}
			}

			markup += render(childTemplate, childState, childElement, option);
		});

		if (extract) {
			childElements.forEach((childElement, i) => {
				const chain = `${childOption}${repeatable ? `${i}.` : ''}`;
				render(childTemplate, state, childElement, chain);
			});
		} else {
			childElements.forEach(childElement => {
				element.removeChild(childElement);
			});
		}
	});

	return `${markup}</${tagName}>`;
}
