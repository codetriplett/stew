import { evaluate } from './evaluate';
import { render } from './render';

export function dynamo (state, item, ...items) {
	if (item === undefined) {
		return '';
	} else if (item === true) {
		return dynamo(state, ...items);
	} else if (item === false) {
		return dynamo(state, evaluate(items.shift()), ...items);
	}
	
	const dynamic = Array.isArray(item);
	const compare = dynamic && evaluate(item);
	
	if (typeof item === 'object') {
		item = (dynamic ? evaluate : render)(item, state);
	}

	if (!items.length) {
		return item;
	} else if (compare) {
		return dynamo(state, item, ...items);
	}

	const addition = dynamo(state, ...items);

	if (typeof addition === 'boolean') {
		return addition ? item : addition;
	}

	return `${item}${addition}`;
}
