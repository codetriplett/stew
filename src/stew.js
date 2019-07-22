import { parse } from './parse';
import { populate } from './populate';
import { traverse } from './traverse';
import { stitch } from './stitch';

export default function stew (initialize, ...parameters) {
	switch (typeof initialize) {
		case 'string':
			return parse(initialize)[0];
		case 'object':
			return traverse(initialize, ...parameters);
		case 'function':
			break;
		default:
			return;
	}

	const state = {};
	const actions = initialize(state);
	const set = new Set();
	let result;

	function register (mount, ...parameters) {
		if (typeof mount === 'string') {
			mount = stew(mount);
		}

		const template = typeof mount === 'object' ? mount : undefined;

		if (template) {
			mount = (update, element) => {
				const object = {};

				traverse(template, state, '', element, object);
				update(stitch(object));
				update(state => traverse(template, state, '', element));
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

					populate(props, resolve, state);

					return state;
				}, element, ...parameters);
			});

			return create;
		}

		if (template) {
			parameters.unshift(template[''][0]);
		} else if (!parameters.length) {
			return create;
		}

		create(...parameters);

		return register;
	}

	result = parameters.length ? register(...parameters) : register;

	for (const key in actions) {
		const action = (...parameters) => {
			actions[key](...parameters);
			set.forEach(resolve => resolve(state));
			set.clear();
		};

		const definition = {
			get: () => action,
			set: () => {},
			enumerable: true
		};

		Object.defineProperty(state, key, definition);
		Object.defineProperty(result, key, definition);
	}

	return result;
}
