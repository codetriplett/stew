import { state } from './state';
import { view } from './view';

export default function stew (object, actions) {
	if (typeof object === 'string') {
		return view(object);
	} else if (typeof object !== 'object') {
		return;
	}

	object = state(object);

	function define (render) {
		if (typeof render === 'string') {
			render = view(render);
		} else if (typeof render !== 'function') {
			return;
		}

		return node => {
			function update () {
				render(object, node);
				
				for (const key in object) {
					object[key] = update;
				}
			}

			update();
		};
	}

	if (typeof actions === 'function') {
		actions = actions(object);

		for (const key in actions) {
			const definition = {
				get: () => actions[key],
				set: () => {},
				enumerable: true
			};

			Object.defineProperty(object, key, definition);
			Object.defineProperty(define, key, definition);
		}
	}

	return define;
}
