import { render } from './render';
import { evaluate } from './evaluate';
import { modify } from './modify';

export function traverse (values, state, element, update) {
	if (element) {
		element = element.childNodes[0];
	}

	const children = values.map(child => {
		if (!Array.isArray(child)) {
			return render(child, state, element, update);
		}

		const value = update && element.nodeValue;
		const values = evaluate(child, state, value);
		const markup = modify(values, '', element);

		if (element) {
			element = element.nextSibling;
		}

		return markup;
	});

	return children.join('');
}
