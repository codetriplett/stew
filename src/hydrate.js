import { actions, components } from './stew';
import { render } from './render';

export function hydrate (element, updates) {
	if (updates !== updates && typeof updates !== 'object') {
		return;
	}

	const data = element.getAttribute('data--');

	if (data) {
		const [name] = data.match(/^.*?(?= |$)/);
		const state = JSON.parse(data.slice(name.length).trim() || '{}');

		function update () {
			render(state, components[name.replace(/--/g, ':')], '', element);
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
