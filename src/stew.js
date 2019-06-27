import { extract } from './extract';
import { render } from './render';
import { parse } from './parse';
import { state } from './state';
import { view } from './view';

const client = typeof Element !== 'undefined';

export default function stew (initialize, ...parameters) {
	switch (typeof initialize) {
		case 'object':
			if (client && parameters[0] instanceof Element) {
				return extract(initialize, ...parameters);
			}

			return render(initialize, ...parameters);
		case 'string':
		case 'undefined':
			if (!initialize || !initialize.indexOf('<')) {
				view(initialize, ...parameters);
			}

			function mount (template) {
				return (update, element, stew) => {
					if (!update) {
						return 'div';
					}

					update(stew(template, element));
					update(state => stew(template, state, element));
				};
			}

			const template = parse(initialize, ...parameters)[0];

			if (client) {
				return mount(template);
			}

			return `(${mount})(${JSON.stringify(template)})`;
		case 'function':
			break;
		default:
			return;
	}

	const store = {};
	const actions = initialize(store);
	const set = new Set();
	let result;

	function register (mount, ...parameters) {
		if (typeof mount === 'string') {
			mount = stew(mount);
		}

		function create (selector, structure, ...parameters) {
			const automatic = !selector;

			if (automatic) {
				selector = mount();
			}
			
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

					const active = typeof output === 'function';

					if (active) {
						resolve = () => set.add(output);
					}

					state(props, resolve, store);

					if (automatic && active) {
						output(store);
					}

					return store;
				}, element, ...parameters, stew);
			})(document || { querySelectorAll: selector => [selector] });

			return create;
		}

		if (parameters.length || result === register) {
			return create(...parameters);
		}

		return create;
	}

	result = parameters.length ? register(...parameters) : register;

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
