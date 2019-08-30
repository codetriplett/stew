import { evaluate } from './evaluate';
import { render } from './render';

export function dynamo (state, item, ...items) {
	if (Array.isArray(item)) {
		item = evaluate(item, state);
	} else if (typeof item === 'object') {
		item = render(item, state);
	}

	if (!items.length) {
		return item;
	}
	
	return `${item}${dynamo(state, ...items)}`;
}
