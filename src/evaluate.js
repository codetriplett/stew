import { fetch } from './fetch';

export function evaluate (item, state) {
	if (!Array.isArray(item)) {
		return item;
	}

	const [key] = item;
	
	return fetch(state, key);
}
