import { survey } from './survey';
import { render } from './render';
import { parse } from './parse';
import { state } from './state';
import { view } from './view';

const client = typeof Element !== 'undefined';

export default function stew (initialize, ...parameters) {
	switch (typeof initialize) {
		case 'object':
			if (client && parameters[0] instanceof Element) {
				return survey(initialize, ...parameters);
			}

			return render(initialize, ...parameters);
		case 'string':
		case 'undefined':
			if (initialize && initialize.indexOf('<')) {
				parse(initialize, ...parameters);
			}

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
		function create (selector, structure, ...parameters) {
			if (!/[.[]/.test(selector)) {
				selector += '.';
			}

			view(selector, structure, (element, props) => {
				let resolve;
				
				mount(output => {
					if (typeof output === 'object') {
						props = output;
						return;
					}

					if (typeof output === 'function') {
						resolve = () => set.add(output);
					}

					return state(props, resolve, store);
				}, element, ...parameters, stew);
			})(document || { querySelectorAll: selector => [selector] });

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
