import { evaluate } from './evaluate';
import { render } from './render';

export function dynamo (items, state, element, update) {
	const hydrate = typeof element === 'string' || undefined;

	if (update) {
		const children = element.childNodes;
		element = children[children.length - 1];
	}

	const values = items.reduceRight((values, item, i) => {
		if (!values) {
			return values;
		}
		
		let [value = true] = values;
		
		if (typeof element === 'object') {
			const elements = update ? [] : element;
			
			if (update) {
				const regex = new RegExp(`^${i}(-|$)`);
				let id;

				while (id !== null && element) {
					id = element.getAttribute('data--');

					if (id && !regex.test(id) || !id && elements.length) {
						break;
					}

					elements.push(element);
					element = element.previousSibling;
				}
			}

			value = render(item, state, i, elements, update);
		} else if (typeof item !== 'string') {
			const compare = item.length > 1;

			if (!compare) {
				if (hydrate) {
					const string = items.slice(0, i).reverse().find(item => {
						return !Array.isArray(item) && element.includes(item);
					});

					if (string) {
						const { length } = string;
						const index = element.lastIndexOf(string) + length;

						value = element.slice(index);
						element = element.slice(0, index);
					}
				} else {
					value = true;
				}
			}

			value = value && evaluate(item, state, hydrate && value);
			
			if (compare) {
				if (value === false) {
					if (!values.length) {
						return value;
					}
					
					values[0] = '';
				}

				return values;
			}
		} else {
			value = item;

			if (element) {
				if (element.endsWith(item)) {
					element = element.slice(0, -item.length);
				} else {
					value = '';
				}
			}
		}

		values.unshift(value);
		return values;
	}, []);

	if (!Array.isArray(values)) {
		return values;
	}

	return !values.length || values.join('');
}
