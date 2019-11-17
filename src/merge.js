export function merge (existing, updates) {
	if (updates !== undefined && existing !== updates) {
		const empty = existing === undefined;
		const structured = typeof existing === 'object';
		const iterative = Array.isArray(existing);
		const related = structured === (typeof updates === 'object');
		const compatible = related && iterative === Array.isArray(updates);

		if (empty || compatible) {
			if (empty || !structured || iterative) {
				return updates;
			}

			for (const key in updates) {
				existing[key] = merge(existing[key], updates[key]);
			}
		}
	}

	return existing;
}
