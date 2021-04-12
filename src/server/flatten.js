export function flatten (content) {
	const all = [];

	for (const it of content) {
		if (Array.isArray(it)) all.push(...flatten(it));
		else if (typeof it === 'string') all.push(it);
	}

	return all;
}
