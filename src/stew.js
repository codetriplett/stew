import { parse } from './parse';
import { traverse } from './traverse';
import { stitch } from './stitch';

export default function stew (template, state) {
	if (typeof template === 'string') {
		return parse(template)[0];
	} else if (typeof template !== 'object') {
		return;
	}

	if (typeof state === 'object') {
		return traverse(template, state);
	} else if (state !== undefined || typeof document === 'undefined') {
		return;
	}

	const selector = template[''][0].split(' ')[0];
	const elements = document.querySelectorAll(selector) || [];

	elements.forEach(element => {
		const actions = {
			'': (name, keys) => {
				const key = keys.pop();

				return event => {
					const object = keys.reduce((item = {}, key) => {
						return item[key];
					}, state);

					switch (name) {
						case 'onclick':
							object[key] = !object[key];
							break;
					}

					traverse(template, state, '', element);
				};
			}
		};

		state = stitch(traverse(template, {}, '', element, actions));
	});
}
