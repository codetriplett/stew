export function compare (prev, it, key) {
	if (it === prev) {
		return true;
	} else if (key || typeof it !== 'object' || typeof prev !== 'object'
		|| Array.isArray(it) !== Array.isArray(prev)) {
		return false;
	} else if (Array.isArray(it)) {
		if (it.length !== prev.length) return false;
		return it.every((it, i) => compare(prev[i], it));
	}

	const entries = Object.entries(it);
	if (entries.length !== Object.keys(prev).length) return false;
	return entries.every(([key, value]) => compare(prev[key], value, key));
}
