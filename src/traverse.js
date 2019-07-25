import { evaluate } from './evaluate';

export function traverse (template, state, scope = '', element, object) {
	if (typeof template !== 'object') {
		return template;
	} else if (Array.isArray(template)) {
		if (typeof element === 'object') {
			element = element.nodeValue || '';
		}

		return evaluate(template, state, scope, element, object);
	}

	const generate = element === undefined;
	const { '': structure, ...attributes } = template;
	const [definition, ...content] = structure;
	const [selector] = definition.split(' ');
	const [tag, ...classes] = selector.split('.');
	let markup = `<${tag}`;

	if (generate && classes.length && !attributes.hasOwnProperty('class')) {
		markup += ` class="${classes.join(' ')}"`;
	}

	for (const name in attributes) {
		const listener = name.startsWith('on');
		let attribute = !generate && element.getAttribute(name) || undefined;
		let expression = attributes[name];

		if (name === 'class' && classes.length) {
			expression = [`${classes.join(' ')} `, ...expression];
		}

		let value = traverse(expression, state, scope, attribute, object);

		if (generate) {
			markup += !listener ? ` ${name}="${value}"` : '';
			continue;
		}
		
		const present = element.hasAttribute(name);

		if (listener) {
			if (!present) {
				element.addEventListener(name.replace(/^on/, ''), value);
			}

			value = 'javascript:void(0);';
		} else if (object) {
			continue;
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
		markup += '>';
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
			let key = scope;
			let iterate = false;

			if (expression.length) {
				if (!object) {
					const value = evaluate([expression], state, scope);

					if (Array.isArray(value)) {
						states.push(...value);
						iterate = true;
					} else if (value !== undefined) {
						states.push(value);
					}
				}

				key += `${expression[0]}.`;

				while (node) {
					if (!node.getAttribute) {
						break;
					}

					const id = node.getAttribute('data--');

					if (!regex.test(id)) {
						break;
					}

					iterate = iterate || id.indexOf('-') !== -1;
					children.push(node);
					node = node.nextSibling;
				}
			} else {
				if (!object) {
					states.push(undefined);
				}

				if (node) {
					children.push(node);
					node = node.nextSibling;
				}
			}

			states.forEach((item, iteration) => {
				const conditional = item !== undefined;
				const id = `${index}${iterate ? `-${iteration}` : ''}`;
				let child = children.shift();

				item = conditional ? { ...state, '': item } : state;

				if (!generate && !child) {
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

				iteration = iterate ? `${key}${iteration}.` : key;
				child = traverse(template, item, iteration, child, object);

				if (generate && child !== undefined) {
					if (conditional) {
						child = String(child).replace(/<[a-z]+/, match => {
							return `${match} data--="${id}"`;
						});
					}

					markup += child;
				}
			});

			if (object) {
				children.forEach((child, iteration) => {
					iteration = iterate ? `${key}${iteration}.` : key;
					traverse(template, state, iteration, child, object);
				});
			} else {
				children.forEach(child => element.removeChild(child));
			}
		});

		if (generate) {
			markup += `</${tag}>`;
		}
	}

	return generate ? markup : object;
}
