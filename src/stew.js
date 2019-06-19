import { state } from './state';
import { view } from './view';

export default function stew (initialize, ...parameters) {
	switch (typeof initialize) {
		case 'object':
			return state(initialize, ...parameters);
		case 'string':
		case 'undefined':
			return view(initialize, ...parameters);
		case 'function':
			break;
		default:
			return;
	}

	const store = {};
	const actions = initialize(store);
	const set = new Set();

	function register (mount, ...parameters) {
		function create (...parameters) {
			let props = {};
			let resolve;

			mount(output => {
				if (typeof output === 'object') {
					props = output;
					return;
				} else if (typeof output === 'function') {
					resolve = () => set.add(output);
				}

				return state(props, resolve, store);
			}, ...parameters);

			return create;
		}

		return parameters.length ? create(...parameters) : create;
	}

	let result = parameters.length ? register(...parameters) : register;

	for (const key in actions) {
		const action = (...parameters) => {
			actions[key](...parameters);
			set.forEach(resolve => resolve(store));
			set.clear();
		};

		const definition = {
			get: () => action,
			set: () => {},
			enumerable: true
		};

		Object.defineProperty(store, key, definition);
		Object.defineProperty(result, key, definition);
	}

	return result;
}
