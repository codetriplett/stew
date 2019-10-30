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

		const update = function (updates, ...parameters) {
			switch (typeof updates) {
				case 'string':
					if (actions.hasOwnProperty(updates)) {
						actions[updates].apply(this, parameters);
					}

					return;
				case 'undefined': break;
				default: return;
			}
			
			render(state, components[name], '', element);
		};

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
