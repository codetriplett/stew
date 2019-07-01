import { parse } from './parse';
import { populate } from './populate';
import { render } from './render';

export default function stew (initialize, ...parameters) {
	switch (typeof initialize) {
		case 'string':
			return parse(initialize)[0];
		case 'object':
			return render(initialize, ...parameters);
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

		let template;

		if (typeof mount === 'object') {
			const props = {};

			template = mount;
			
			mount = (update, element) => {
				render(template, props, element, '');
				update(props);
				update(state => render(template, state, element, state));
			};
		}

		function create (selector, ...parameters) {
			const elements = document.querySelectorAll(selector) || [];

			elements.forEach(element => {
				let props;
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

					populate(props, resolve, store);

					if (template && active) {
						output(store);
					}

					return store;
				}, element, ...parameters);
			});

			return create;
		}

		return template ? create(template[''][0], ...parameters) : create;
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
