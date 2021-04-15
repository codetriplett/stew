import { registry, trigger } from '../manage';
import { update } from './update';

export function transform (memory, props, content) {
	const { '': core, ...prev } = memory;
	const [fragment, { '': state }, type, shortcut] = core;
	const entries = Object.entries(prev);

	if (!props) {
		props = prev;
		if (shortcut) content = shortcut();
	} else if (!fragment) {
		core[0] = [];
	} else if (entries.length === Object.keys(props).length
		&& entries.every(([name, value]) => value === props[name])) {
		if (shortcut) shortcut(content);
		return fragment;		
	}

	function callback (...params) {
		if (!content && content !== 0 || content === true) return;
		const [elm, direct, i] = params;

		core[3] = (...params) => {
			if (!params.length) return content;
			direct[''][0][i] = params[0];
			trigger(direct, elm);
		};

		if (Array.isArray(content) && typeof content === 'function') return content(...params);
		return update('', {}, content)(...params);
	}
	
	if (registry.has(state)) registry.get(state).delete(state);
	core[3] = undefined;
	Object.assign(memory, props);
	const result = type({ ...props, '': state }, callback);
	if (Array.isArray(result)) return result;
	return result === undefined ? [] : [result];
}
