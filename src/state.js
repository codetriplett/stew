export function state (props, resolve, store) {
	if (props === store) {
		return store;
	} else if (typeof props === 'function') {
		if (resolve.has(props)) {
			resolve.delete(props);

			if (!resolve.size) {
				store = undefined;
			}
		} else {
			resolve.add(props);
		}

		return store;
	}

	const additive = typeof resolve === 'function';
	
	if (Array.isArray(props)) {
		if (store === undefined) {
			store = [];
		} else if (!Array.isArray(store)) {
			return store;
		}

		if (additive) {
			store.push(...props);
		} else {
			store = props.map(prop => {
				const index = store.indexOf(prop);
				return index !== -1 ? store[index] : state(prop, resolve);
			});
		}
	} else if (typeof props === 'object') {
		if (store === undefined) {
			store = {};
		} else if (typeof store !== 'object' || Array.isArray(store)) {
			return store;
		}

		for (const key in props) {
			let value = state(props[key], resolve, store[key]);

			if (store.hasOwnProperty(key)) {
				if (additive) {
					store[key] = resolve;
				} else {
					store[key] = value;
				}

				continue;
			} else if (typeof resolve === 'function') {
				resolve = new Set([resolve]);
			}

			Object.defineProperty(store, key, {
				get: () => value,
				set: prop => value = state(prop, resolve, value),
				enumerable: true
			});
		}
	}

	if (!additive && props !== store) {
		resolve.forEach(resolve => resolve());
	}

	return typeof props !== 'object' ? props : store;
}
