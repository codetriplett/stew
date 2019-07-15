import { stitch } from './stitch';

export function evaluate (template, stack, element, option) {
	if (typeof template !== 'object') {
		return template;
	}

	const root = !Array.isArray(stack);
	const generate = element === undefined || typeof element === 'number';
	const extract = root && !generate;
	const update = typeof element === 'object' && !extract;

	if (generate && root) {
		stack = [stack];
	}

	if (Array.isArray(template)) {
		if (typeof element === 'object' && element.nodeValue !== null) {
			element = element.nodeValue;
		}

		let index = 0;
	
		while (index < template.length) {
			let value = template[index++];
	
			if (Array.isArray(value)) {
				const next = template[index];
				const alternating = !Array.isArray(next);
				const [chain, check] = value;
				const absolute = chain.startsWith('.');
				const compare = check !== undefined;
				let key = chain.replace(/^\.+|\.+$/g, '');

				if (compare && alternating) {
					index++;
				}

				if (!extract) {
					const state = stack[absolute ? stack.length - 1 : 0];

					value = key ? key.split('.').reduce((object, key) => {
						if (object === undefined || object === null) {
							return;
						}

						return object[key];
					}, state) : state;

					if (compare) {
						value = value === check;
		
						if (alternating) {
							value = value ? next : '';
						}
					}
				} else {
					let index = alternating ? element.indexOf(next) : -1;
	
					value = index !== -1 ? element.slice(0, index) : element;

					if (!absolute) {
						key = `${option || ''}${key}`;
					}

					if (compare) {
						stack[key] = check;
					} else if (value && !isNaN(value)) {
						stack[key] = Number(value);
					} else {
						stack[key] = value;
					}
				}
			}

			if (!extract) {
				element = element === undefined ? value : `${element}${value}`;
			} else if (element.startsWith(value)) {
				element = element.slice(value.length);
			}
		}

		return extract ? stack : element;
	}

	const { '': structure, ...attributes } = template;
	const [definition, ...content] = structure;
	const [selector] = definition.split(' ');
	const [tag, ...classes] = selector.split('.');
	let markup = `<${tag}`;

	for (const name in attributes) {
		const listener = name.startsWith('on');
		let attribute = !generate ? element.getAttribute(name) : undefined;
		let template = attributes[name];

		if (name === 'class' && classes) {
			template = [`${classes.join(' ')} `, ...template];
		}

		if (extract && attribute === null) {
			attribute = '';
		}

		let value = evaluate(template, stack, attribute, option);

		if (generate && !listener) {
			markup += ` ${name}="${value}"`;
		}
		
		if (!update) {
			continue;
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
		} else if (String(value) !== element) {
			element.setAttribute(name, value);
		}
	}

	if (generate) {
		if (typeof element === 'number' && typeof option === 'number') {
			element += `-${option}`;
		}

		markup += `${element !== undefined ? ` data--="${element}"` : ''}>`;
	}

	if (content.length) {
		let node = !generate ? element.childNodes[0] : undefined;
		
		content.forEach((template, index) => {
			const structure = (template[''] || [''])[0];
			const [selector, ...expression] = structure.split(' ');
			const [tag, ...classes] = selector.split('.');
			const regex = new RegExp(`^${index}(-|$)`);
			const states = [];
			const children = [];
			let iterate = false;

			if (expression.length) {
				if (!extract) {
					const value = evaluate([expression], stack);

					if (Array.isArray(value)) {
						states.push(...value);
						iterate = true;
					} else if (value !== undefined && !extract) {
						states.push(value);
					}
				}

				while (node) {
					const id = node.getAttribute('data--');

					if (!regex.test(id)) {
						break;
					}

					iterate = iterate || id.indexOf('-') !== -1;
					children.push(node);
					node = node.nextSibling;
				}
			} else if (!expression.length) {
				if (!extract) {
					states.push(undefined);
				}

				if (node) {
					children.push(node);
					node = node.nextSibling;
				}
			}

			states.forEach((state, iteration) => {
				const conditional = state !== undefined;
				const scope = conditional ? [state, ...stack] : stack;
				let child = children.shift();

				if (generate) {
					child = conditional ? index : undefined;
				} else if (!child) {
					const id = `${index}${iterate ? `-${iteration}` : ''}`;

					if (tag) {
						child = document.createElement(tag);
						child.setAttribute('data--', id);

						if (classes.length) {
							child.className = classes.join(' ');
						}
					} else {
						child = document.createTextNode('');
					}

					if (node) {
						element.insertBefore(child, node);
					} else {
						element.appendChild(child);
					}
				}

				if (!iterate) {
					iteration = undefined;
				}

				if (generate) {
					markup += evaluate(template, scope, child, iteration);
				}
			});

			if (!extract) {
				children.forEach(child => element.removeChild(child));
			} else {
				children.forEach(child => {
					evaluate(template, stack, child, option || '');
				});
			}
		});

		if (generate) {
			markup += `</${tag}>`;
		}
	}

	if (!extract) {
		return markup;
	} else if (!option) {
		return stitch(stack);
	}

	return stack;
}
