import { components } from './stew';
import { render } from './render';
import { merge } from './merge';

export function hydrate (element, updates) {
	if (updates !== updates && typeof updates !== 'object') {
		return;
	}

	const data = element.getAttribute('data--');

	if (data) {
		const [name] = data.match(/^.*?(?= |$)/);
		const view = components[name.replace(/--/g, ':')];
		const state = JSON.parse(data.slice(name.length).trim() || '{}');

		function update (object) {
			if (typeof object === 'object' && !Array.isArray(object)) {
				merge(state, object);
			}

			render(state, view, '', element);
		}

		Object.assign(state, { '': state, '.': [update] });
		update();
		update[''] = true;
		element.removeAttribute('data--');
	}

	if (!updates) {
		return;
	}

	const update = instances.get(element);

	if (update) {
		update(updates);
	}
}
