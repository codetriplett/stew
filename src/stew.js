import { State } from './State';
import { view } from './view';

export default function stew (initialize, ...parameters) {
	switch (typeof initialize) {
		case 'object':
			const state = new State(initialize, ...parameters);
			return state.update.bind(state);
		case 'string':
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
			const state = new State(mount(resolve => {
				state.prepare(resolve, set)
			}, ...parameters), store);

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
