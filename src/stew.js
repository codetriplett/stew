import { state } from './state';
import { view } from './view';

export default function stew (input) {
	if (typeof input === 'string') {
		return view(input);
	} else if (typeof input !== 'object') {
		return;
	}

	const object = state(input);

	function creator (input) {
		if (typeof input === 'string') {
			input = view(input);
		} else if (typeof input !== 'function') {
			return;
		}

		return (...parameters) => {
			function update () {
				input(object, ...parameters);

				for (const key in object) {
					object[key] = update;
				}
			}

			update();

			return creator;
		};
	}

	for (const key in object) {
		Object.defineProperty(creator, key, {
			get: () => object[key],
			set: value => object[key] = value
		});
	}

	return creator;
}
