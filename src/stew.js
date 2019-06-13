import { state } from './state';

export default function stew (object, actions) {
	object = state(object);
	actions = actions(object);

	function define (mount, translate) {
		return (element, ...parameters) => {
			let resolver;

			function update () {
				const props = translate(object, ...parameters);

				for (const key in object) {
					object[key] = update;
				}

				resolver(props);
				return props;
			}

			mount(element, output => {
				resolver = output;
				return update();
			});
		};
	}

	for (const key in actions) {
		const definition = {
			get: () => actions[key],
			set: () => {},
			enumerable: true
		};

		Object.defineProperty(object, key, definition);
		Object.defineProperty(define, key, definition);
	}

	return define;
}
