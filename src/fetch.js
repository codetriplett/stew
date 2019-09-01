export function fetch ([key, valid], state, value) {
	if (state === undefined) {
		return valid !== undefined;
	} else if (value === undefined) {
		return state[key];
	} else if (typeof value === 'function') {
		return value(state, key);
	}
	
	state[key] = value;
}
