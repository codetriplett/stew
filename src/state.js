export class State {
	constructor (props = {}, store = {}) {
		this.props = props;
		this.store = store;
	}

	traverse (props, store) {
		if (typeof props !== 'object') {
			return props;
		} else if (Array.isArray(props)) {
			if (!Array.isArray(store)) {
				store = [];
			}

			return props.map(prop => {
				const index = store.indexOf(prop);
				return index !== -1 ? store[index] : this.traverse(prop);
			});
		}

		if (typeof store !== 'object' || Array.isArray(store)) {
			store = {};
		}

		for (const key in props) {
			const set = new Set([this]);
			let value = this.traverse(props[key], store[key]);

			if (store.hasOwnProperty(key)) {
				store[key] = this;
				continue;
			}

			Object.defineProperty(store, key, {
				get: () => value,
				set: prop => {
					if (props === value) {
						return;
					} else if (prop instanceof State) {
						if (prop.active) {
							set.add(prop);
						} else {
							set.delete(prop);

							if (!set.size) {
								value = undefined;
							}
						}

						return;
					}

					value = this.traverse(prop, value);
					set.forEach(({ resolve }) => resolve());
				},
				enumerable: true
			});
		}

		return store;
	}

	prepare (resolve, set) {
		if (typeof resolve === 'function') {
			this.resolve = () => set.add(resolve);

			if (!this.active) {
				this.active = true;
				this.traverse(this.props, this.store);
			}
		} else if (this.active) {
			this.active = false;
			this.traverse(this.props, this.store);
			this.resolve = undefined;
		}

		return this.store;
	}
}
