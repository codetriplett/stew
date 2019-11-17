import { actions } from './stew';
import { fetch, CLICK, KEYDOWN, KEYUP, KEYPRESS } from './fetch';
import { clean } from './clean';
import { merge } from './merge';

const ons = {
	'onclick': CLICK,
	'onkeydown': KEYDOWN,
	'onkeyup': KEYUP,
	'onkeypress': KEYPRESS
};

export function evaluate (items, state, content, element) {
	const strings = items.filter(item => typeof item === 'string').reverse();
	const activate = typeof content === 'string' && content.startsWith('on');
	const { '.': [update] } = state;
	let hydrate = !activate && !update[''];
	let candidate = '';
	let existing;

	if (activate) {
		if (typeof element === 'string' || element[content]) {
			return element;
		}

		const indices = items.reduce((indices, item, i) => {
			if (typeof item === 'string') {
				indices.push(i);
			}

			return indices;
		}, []);
		
		const { length } = items;
		const [index = length] = indices;
		const type = ons[content];

		const modifications = items.slice(0, index).map(item => {
			return fetch(item, state, type);
		}).filter(modification => typeof modification === 'function');

		const extras = indices.map((start, i) => {
			const finish = indices[i + 1] || length;
			const [name, ...parameters] = items.slice(start, finish);

			return [...name.split(/\s+/g), ...parameters];
		});

		element[content] = event => {
			modifications.forEach(modification => modification(event));

			const objects = extras.map(([name, ...parameters]) => {
				const { [name]: action } = actions;

				if (action) {
					const values = parameters.map(item => {
						return clean(fetch(item, state));
					});

					return action(...values);
				}
			});

			Promise.all(objects).then(objects => {
				const object = objects.reduce((object, item) => {
					if (typeof item === 'object' && !Array.isArray(item)) {
						return merge(object, item);
					}

					return object;
				}, modifications.length ? {} : undefined);

				update(object);
			});
		};

		return element;
	} else if (typeof element === 'object') {
		existing = element.getAttribute(content) || '';
	} else if (typeof content === 'object') {
		existing = content.nodeValue || '';
	} else {
		hydrate = false;
	}

	let value = items.reduceRight((value, item) => {
		const dynamic = typeof item !== 'string';

		if (!value) {
			return value;
		} else if (!dynamic || hydrate && item.length === 1) {
			candidate = existing;

			if (!hydrate) {
				candidate = strings.shift();
			} else if (strings.length) {
				let [string] = strings;

				if (dynamic) {
					while (string !== undefined) {
						const index = existing.lastIndexOf(string);
				
						if (index !== -1) {
							candidate = existing.slice(index + string.length);
							break;
						}
				
						string = strings.shift();
					}
				} else if (existing.endsWith(string)) {
					candidate = strings.shift();
				} else {
					candidate = '';
				}

				if (candidate) {
					existing = existing.slice(0, -candidate.length);
				}
			}

			if (!dynamic || !candidate) {
				value.unshift(candidate);
				return value;
			}
		}

		const { length } = value;
		const skip = length > 0 && item.length > 1 && candidate === '';
		const compare = item.length > 1;

		item = skip || fetch(item, state, hydrate ? candidate : undefined);

		if (typeof item === 'boolean' && !compare) {
			item = '';
		}

		if (item === false) {
			if (!length) {
				return false;
			}
			
			value[0] = '';
		} else if (item !== true) {
			if (item && hydrate) {
				existing = existing.slice(0, -item.length);
			}

			value.unshift(item);
			candidate = item;
		}

		return value;
	}, []);

	if (hydrate) {
		return content;
	} else if (value) {
		if (value.length > 1) {
			value = value.join('');
		} else {
			value = value.length ? value[0] : true;
		}
	}
	
	if (typeof content !== 'string') {
		value = typeof value === 'string' ? value : '';

		if (!content) {
			return value;
		} else if (value !== existing) {
			content.nodeValue = value;
		}

		return content;
	} else if (element === undefined) {
		return value;
	} else if (value === undefined) {
		value = '';
	}
	
	if (typeof element === 'string') {
		element = element.slice(0, -1);

		if (value === true) {
			value = ` ${content}`;
		} else {
			value = value !== false ? ` ${content}="${value}"` : '';
		}

		return `${element}${value}>`;
	} else if (typeof value === 'boolean') {
		const exists = element.hasAttribute(content);

		if (value && !exists) {
			element.toggleAttribute(content, true);
		} else if (!value && exists) {
			element.removeAttribute(content);
		}
	} else if (value !== element.getAttribute(content)) {
		element.setAttribute(content, value);
	}

	return element;
}
